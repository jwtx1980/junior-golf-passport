(function () {
  var config = window.JGP_CONFIG;
  var supabaseFactory = window.supabase;
  var client = config && supabaseFactory
    ? supabaseFactory.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

  var state = {
    session: null,
    me: null,
    selectedGolferId: "",
    currentDraft: null
  };

  var elements = {
    authPanel: document.getElementById("auth-panel"),
    appPanel: document.getElementById("dashboard-app"),
    email: document.getElementById("auth-email"),
    password: document.getElementById("auth-password"),
    displayName: document.getElementById("auth-name"),
    authStatus: document.getElementById("auth-status"),
    signIn: document.getElementById("sign-in-button"),
    signUp: document.getElementById("sign-up-button"),
    signOut: document.getElementById("sign-out-button"),
    accountSummary: document.getElementById("account-summary"),
    passwordPanel: document.getElementById("password-panel"),
    newPassword: document.getElementById("new-password"),
    updatePassword: document.getElementById("update-password-button"),
    golferSelect: document.getElementById("golfer-select"),
    createGolferPanel: document.getElementById("create-golfer-panel"),
    golferName: document.getElementById("golfer-name"),
    golferSlug: document.getElementById("golfer-slug"),
    createGolfer: document.getElementById("create-golfer-button"),
    note: document.getElementById("rough-note"),
    generatedPrompt: document.getElementById("generated-prompt"),
    generatePrompt: document.getElementById("generate-prompt-button"),
    copyPrompt: document.getElementById("copy-prompt-button"),
    pastedResult: document.getElementById("pasted-ai-result"),
    parseResult: document.getElementById("parse-result-button"),
    draftWithAi: document.getElementById("draft-with-ai-button"),
    entryTitle: document.getElementById("entry-title"),
    entryType: document.getElementById("entry-type"),
    entryStory: document.getElementById("entry-story"),
    entryTags: document.getElementById("entry-tags"),
    courseName: document.getElementById("course-name"),
    courseCity: document.getElementById("course-city"),
    courseState: document.getElementById("course-state"),
    visibility: document.getElementById("entry-visibility"),
    approved: document.getElementById("entry-approved"),
    saveMemory: document.getElementById("save-memory-button"),
    dashboardStatus: document.getElementById("dashboard-status"),
    apiStatus: document.getElementById("api-status")
  };

  function setText(node, text) {
    if (node) node.textContent = text || "";
  }

  function setHidden(node, hidden) {
    if (node) node.hidden = Boolean(hidden);
  }

  function setStatus(message) {
    setText(elements.dashboardStatus, message);
  }

  function setAuthStatus(message) {
    setText(elements.authStatus, message);
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + state.session.access_token,
      "Content-Type": "application/json"
    };
  }

  async function api(path, options) {
    var response = await fetch(config.passportApiBaseUrl + path, {
      method: options && options.method ? options.method : "GET",
      headers: authHeaders(),
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }
    return payload;
  }

  function freeAiPrompt(note) {
    return [
      "You are helping turn a junior golfer's rough golf note into a structured Junior Golf Passport entry.",
      "",
      "Return only valid JSON. Do not include markdown. Do not include comments.",
      "If you are unsure about a value, use null and add a question in the questions array.",
      "Do not invent scores, dates, or locations.",
      "",
      "Rough note:",
      '"""',
      note,
      '"""',
      "",
      "Return JSON with this shape:",
      "{",
      '  "entry_type": "course_played | round | achievement | tournament | memory",',
      '  "title": "short title",',
      '  "course": { "name": "course name or null", "city": "city or null", "state": "state or null", "country": "country or null" },',
      '  "round": { "played_on": "YYYY-MM-DD or null", "score": null, "holes": null, "highlight": "short highlight or null" },',
      '  "achievement": { "type": "achievement type or null", "value": "achievement value or null" },',
      '  "tournament": { "name": "event name or null", "division": "division or null", "finish": "finish or null" },',
      '  "story": "polished public-friendly story draft",',
      '  "tags": ["tag one", "tag two"],',
      '  "visibility": "private",',
      '  "confidence": "high | medium | low",',
      '  "questions": ["question one if needed"]',
      "}"
    ].join("\n");
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function selectedGolfer() {
    var golfers = state.me && Array.isArray(state.me.golfers) ? state.me.golfers : [];
    return golfers.find(function (row) {
      return row.golfers && row.golfers.id === state.selectedGolferId;
    });
  }

  function render() {
    var signedIn = Boolean(state.session && state.me);
    setHidden(elements.authPanel, signedIn);
    setHidden(elements.appPanel, !signedIn);

    if (!signedIn) return;

    var profile = state.me.profile;
    setText(
      elements.accountSummary,
      [
        profile.display_name || profile.email || "Signed in",
        profile.has_ai_access ? "AI access enabled" : "Manual and Use Your Own AI access",
        profile.must_change_password ? "Password update required" : ""
      ].filter(Boolean).join(" - ")
    );
    setHidden(elements.passwordPanel, !profile.must_change_password);

    var golfers = state.me.golfers || [];
    elements.golferSelect.innerHTML = golfers.map(function (row) {
      var golfer = row.golfers;
      return '<option value="' + golfer.id + '">' + golfer.display_name + '</option>';
    }).join("");

    if (!state.selectedGolferId && golfers[0] && golfers[0].golfers) {
      state.selectedGolferId = golfers[0].golfers.id;
    }
    elements.golferSelect.value = state.selectedGolferId;
    setHidden(elements.createGolferPanel, golfers.length > 0);
    setText(elements.apiStatus, config.passportApiBaseUrl);
  }

  async function refreshMe() {
    if (!state.session) return;
    state.me = await api("/me");
    render();
  }

  async function loadSession() {
    if (!client) {
      setAuthStatus("Supabase config did not load.");
      return;
    }
    var result = await client.auth.getSession();
    state.session = result.data.session;
    if (state.session) {
      await refreshMe();
    } else {
      render();
    }
  }

  async function signIn() {
    setAuthStatus("Signing in...");
    var result = await client.auth.signInWithPassword({
      email: elements.email.value.trim(),
      password: elements.password.value
    });
    if (result.error) throw result.error;
    state.session = result.data.session;
    await refreshMe();
    setAuthStatus("");
  }

  async function signUp() {
    setAuthStatus("Creating account...");
    var result = await client.auth.signUp({
      email: elements.email.value.trim(),
      password: elements.password.value,
      options: {
        data: {
          display_name: elements.displayName.value.trim()
        }
      }
    });
    if (result.error) throw result.error;
    state.session = result.data.session;
    if (state.session) {
      await refreshMe();
      setAuthStatus("");
    } else {
      setAuthStatus("Account created. Check email confirmation settings if sign-in is required.");
    }
  }

  async function updatePassword() {
    setStatus("Updating password...");
    var result = await client.auth.updateUser({
      password: elements.newPassword.value
    });
    if (result.error) throw result.error;
    await api("/me/password-updated", { method: "POST", body: {} });
    elements.newPassword.value = "";
    await refreshMe();
    setStatus("Password updated.");
  }

  async function createGolfer() {
    setStatus("Creating golfer profile...");
    var name = elements.golferName.value.trim();
    var slug = normalizeSlug(elements.golferSlug.value || name);
    var payload = await api("/golfers", {
      method: "POST",
      body: {
        display_name: name,
        slug: slug,
        headline: "Courses played, memories made, milestones earned.",
        visibility: "public"
      }
    });
    state.selectedGolferId = payload.golfer.id;
    await refreshMe();
    setStatus("Golfer profile created.");
  }

  function applyDraft(draft) {
    state.currentDraft = draft;
    elements.entryTitle.value = draft.title || "";
    elements.entryType.value = draft.entry_type || "memory";
    elements.entryStory.value = draft.story || "";
    elements.entryTags.value = Array.isArray(draft.tags) ? draft.tags.join(", ") : "";
    elements.visibility.value = draft.visibility || "private";
    if (draft.course) {
      elements.courseName.value = draft.course.name || "";
      elements.courseCity.value = draft.course.city || "";
      elements.courseState.value = draft.course.state || "";
    }
  }

  async function parsePastedResult() {
    setStatus("Parsing pasted AI result...");
    var payload = await api("/ai/parse-pasted-result", {
      method: "POST",
      body: { result: elements.pastedResult.value }
    });
    applyDraft(payload.draft);
    setStatus("Draft parsed. Review before saving.");
  }

  async function draftWithAi() {
    setStatus("Drafting with built-in AI...");
    var payload = await api("/ai/draft-entry", {
      method: "POST",
      body: {
        golfer_id: state.selectedGolferId,
        note: elements.note.value
      }
    });
    applyDraft(payload.draft);
    setStatus("AI draft ready. Review before saving.");
  }

  async function saveMemory() {
    if (!state.selectedGolferId) {
      throw new Error("Create or select a golfer first.");
    }

    setStatus("Saving memory...");
    var courseId = null;
    if (elements.courseName.value.trim()) {
      var coursePayload = await api("/courses", {
        method: "POST",
        body: {
          name: elements.courseName.value.trim(),
          city: elements.courseCity.value.trim(),
          state: elements.courseState.value.trim(),
          country: "United States"
        }
      });
      courseId = coursePayload.course.id;
    }

    await api("/memories", {
      method: "POST",
      body: {
        golfer_id: state.selectedGolferId,
        course_id: courseId,
        title: elements.entryTitle.value.trim(),
        entry_type: elements.entryType.value,
        story: elements.entryStory.value.trim(),
        raw_note: elements.note.value.trim(),
        tags: elements.entryTags.value.split(",").map(function (tag) {
          return tag.trim();
        }).filter(Boolean),
        visibility: elements.visibility.value,
        is_approved: elements.approved.checked
      }
    });

    setStatus("Saved. Public entries appear after they are approved and marked public.");
  }

  function bind(button, handler, statusHandler) {
    if (!button) return;
    button.addEventListener("click", function () {
      Promise.resolve()
        .then(handler)
        .catch(function (error) {
          (statusHandler || setStatus)(error.message);
        });
    });
  }

  bind(elements.signIn, signIn, setAuthStatus);
  bind(elements.signUp, signUp, setAuthStatus);
  bind(elements.updatePassword, updatePassword);
  bind(elements.createGolfer, createGolfer);
  bind(elements.parseResult, parsePastedResult);
  bind(elements.draftWithAi, draftWithAi);
  bind(elements.saveMemory, saveMemory);

  bind(elements.generatePrompt, function () {
    elements.generatedPrompt.value = freeAiPrompt(elements.note.value.trim());
    setStatus("Prompt generated. Copy it into your own AI tool.");
  });

  bind(elements.copyPrompt, function () {
    return navigator.clipboard.writeText(elements.generatedPrompt.value).then(function () {
      setStatus("Prompt copied.");
    });
  });

  bind(elements.signOut, async function () {
    await client.auth.signOut();
    state.session = null;
    state.me = null;
    state.selectedGolferId = "";
    render();
  });

  if (elements.golferSelect) {
    elements.golferSelect.addEventListener("change", function () {
      state.selectedGolferId = elements.golferSelect.value;
    });
  }

  if (elements.golferName) {
    elements.golferName.addEventListener("input", function () {
      if (!elements.golferSlug.value.trim()) {
        elements.golferSlug.value = normalizeSlug(elements.golferName.value);
      }
    });
  }

  loadSession().catch(function (error) {
    setAuthStatus(error.message);
  });
})();
