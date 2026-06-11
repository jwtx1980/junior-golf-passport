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
    currentDraft: null,
    entries: null,
    currentEdit: null,
    renderedRows: {}
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
    magicLink: document.getElementById("magic-link-button"),
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
    courseLatitude: document.getElementById("course-latitude"),
    courseLongitude: document.getElementById("course-longitude"),
    courseVerificationStatus: document.getElementById("course-verification-status"),
    courseVerificationSource: document.getElementById("course-verification-source"),
    entryDate: document.getElementById("entry-date"),
    roundScore: document.getElementById("round-score"),
    roundHoles: document.getElementById("round-holes"),
    roundHighlight: document.getElementById("round-highlight"),
    achievementType: document.getElementById("achievement-type"),
    achievementValue: document.getElementById("achievement-value"),
    tournamentName: document.getElementById("tournament-name"),
    tournamentDivision: document.getElementById("tournament-division"),
    tournamentFinish: document.getElementById("tournament-finish"),
    tournamentResultUrl: document.getElementById("tournament-result-url"),
    visibility: document.getElementById("entry-visibility"),
    approved: document.getElementById("entry-approved"),
    photoFile: document.getElementById("photo-file"),
    photoCaption: document.getElementById("photo-caption"),
    photoVisibility: document.getElementById("photo-visibility"),
    photoApproved: document.getElementById("photo-approved"),
    uploadPhoto: document.getElementById("upload-photo-button"),
    saveEntry: document.getElementById("save-entry-button"),
    dashboardStatus: document.getElementById("dashboard-status"),
    apiStatus: document.getElementById("api-status"),
    entryList: document.getElementById("entry-list"),
    snapshot: document.getElementById("dashboard-snapshot")
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  function safeFileName(value) {
    return String(value || "photo")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "photo";
  }

  function optionalNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function comparableText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function comparableNumber(value) {
    var number = optionalNumber(value);
    return number === null ? "" : String(number);
  }

  function courseStatusText(course) {
    if (!course) return "";
    var status = String(course.verification_status || "manual").replace(/_/g, " ");
    var hasPin = Number.isFinite(Number(course.latitude)) && Number.isFinite(Number(course.longitude));
    return hasPin ? status + " pin" : status;
  }

  function entryCollections() {
    if (!state.entries) return [];
    return []
      .concat(state.entries.memories || [])
      .concat(state.entries.rounds || [])
      .concat(state.entries.achievements || [])
      .concat(state.entries.tournaments || [])
      .concat(state.entries.photos || []);
  }

  function courseBackedEntries() {
    if (!state.entries) return [];
    return []
      .concat(state.entries.memories || [])
      .concat(state.entries.rounds || [])
      .concat(state.entries.achievements || [])
      .concat(state.entries.tournaments || []);
  }

  function renderSnapshot() {
    if (!elements.snapshot) return;
    var entries = entryCollections();
    var publicReady = entries.filter(function (entry) {
      return entry.is_approved && ["public", "unlisted"].includes(entry.visibility);
    });
    var drafts = entries.filter(function (entry) {
      return !entry.is_approved || entry.visibility === "private";
    });
    var verifiedCourseIds = {};
    courseBackedEntries().forEach(function (entry) {
      var course = entry.courses;
      if (
        course &&
        course.id &&
        course.verification_status === "verified" &&
        Number.isFinite(Number(course.latitude)) &&
        Number.isFinite(Number(course.longitude))
      ) {
        verifiedCourseIds[course.id] = true;
      }
    });

    elements.snapshot.innerHTML = [
      "<div><strong>" + entries.length + "</strong><span>Saved entries</span></div>",
      "<div><strong>" + publicReady.length + "</strong><span>Public ready</span></div>",
      "<div><strong>" + drafts.length + "</strong><span>Draft/private</span></div>",
      "<div><strong>" + Object.keys(verifiedCourseIds).length + "</strong><span>Verified pins</span></div>"
    ].join("");
  }

  function selectedGolfer() {
    var golfers = state.me && Array.isArray(state.me.golfers) ? state.me.golfers : [];
    return golfers.find(function (row) {
      return row.golfers && row.golfers.id === state.selectedGolferId;
    });
  }

  function setEditMode(edit) {
    state.currentEdit = edit;
    if (elements.saveEntry) {
      elements.saveEntry.textContent = edit && edit.kind !== "photos" ? "Update Entry" : "Save Entry";
    }
    if (elements.uploadPhoto) {
      elements.uploadPhoto.textContent = edit && edit.kind === "photos" ? "Update Photo" : "Upload Photo";
    }
  }

  function clearEntryForm() {
    [
      elements.note,
      elements.entryTitle,
      elements.entryStory,
      elements.entryTags,
      elements.courseName,
      elements.courseCity,
      elements.courseState,
      elements.courseLatitude,
      elements.courseLongitude,
      elements.entryDate,
      elements.roundScore,
      elements.roundHoles,
      elements.roundHighlight,
      elements.achievementType,
      elements.achievementValue,
      elements.tournamentName,
      elements.tournamentDivision,
      elements.tournamentFinish,
      elements.tournamentResultUrl
    ].forEach(function (field) {
      if (field) field.value = "";
    });
    if (elements.entryType) elements.entryType.value = "memory";
    if (elements.visibility) elements.visibility.value = "private";
    if (elements.courseVerificationStatus) elements.courseVerificationStatus.value = "manual";
    if (elements.courseVerificationSource) elements.courseVerificationSource.value = "manual_admin";
    if (elements.approved) elements.approved.checked = false;
    setEditMode(null);
  }

  function clearPhotoForm() {
    if (elements.photoFile) elements.photoFile.value = "";
    if (elements.photoCaption) elements.photoCaption.value = "";
    if (elements.photoVisibility) elements.photoVisibility.value = "private";
    if (elements.photoApproved) elements.photoApproved.checked = false;
    setEditMode(null);
  }

  function renderEntries() {
    if (!elements.entryList) return;
    if (!state.selectedGolferId) {
      renderSnapshot();
      elements.entryList.innerHTML = '<p class="empty-state">Choose a golfer to load saved entries.</p>';
      return;
    }
    if (!state.entries) {
      renderSnapshot();
      elements.entryList.innerHTML = '<p class="empty-state">Loading saved entries...</p>';
      return;
    }

    state.renderedRows = {};
    var rows = []
      .concat((state.entries.memories || []).map(function (item) {
        return {
          id: item.id,
          kind: "memories",
          raw: item,
          type: item.entry_type || "memory",
          title: item.title,
          detail: item.story,
          date: item.created_at,
          course: item.courses && item.courses.name,
          courseMeta: courseStatusText(item.courses),
          visibility: item.visibility,
          approved: item.is_approved
        };
      }))
      .concat((state.entries.rounds || []).map(function (item) {
        return {
          id: item.id,
          kind: "rounds",
          raw: item,
          type: "round",
          title: item.score ? "Round of " + item.score : "Round played",
          detail: item.story || item.notes,
          date: item.played_on || item.created_at,
          course: item.courses && item.courses.name,
          courseMeta: courseStatusText(item.courses),
          visibility: item.visibility,
          approved: item.is_approved
        };
      }))
      .concat((state.entries.achievements || []).map(function (item) {
        return {
          id: item.id,
          kind: "achievements",
          raw: item,
          type: "achievement",
          title: item.title,
          detail: item.story || item.value,
          date: item.achieved_on || item.created_at,
          course: item.courses && item.courses.name,
          courseMeta: courseStatusText(item.courses),
          visibility: item.visibility,
          approved: item.is_approved
        };
      }))
      .concat((state.entries.tournaments || []).map(function (item) {
        return {
          id: item.id,
          kind: "tournaments",
          raw: item,
          type: "tournament",
          title: item.event_name,
          detail: [item.division, item.finish, item.story].filter(Boolean).join(" - "),
          date: item.played_on || item.created_at,
          course: item.courses && item.courses.name,
          courseMeta: courseStatusText(item.courses),
          visibility: item.visibility,
          approved: item.is_approved
        };
      }))
      .concat((state.entries.photos || []).map(function (item) {
        return {
          id: item.id,
          kind: "photos",
          raw: item,
          type: "photo",
          title: item.caption || "Passport photo",
          detail: item.storage_path,
          date: item.created_at,
          image: item.signed_url,
          visibility: item.visibility,
          approved: item.is_approved
        };
      }));

    rows.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });

    if (!rows.length) {
      renderSnapshot();
      elements.entryList.innerHTML = '<p class="empty-state">No saved entries yet.</p>';
      return;
    }

    renderSnapshot();
    elements.entryList.innerHTML = rows.slice(0, 24).map(function (row) {
      var rowKey = row.kind + ":" + row.id;
      state.renderedRows[rowKey] = row;
      var status = row.visibility + (row.approved ? " / approved" : " / draft");
      return [
        '<article class="entry-list-item" data-row-key="' + escapeHtml(rowKey) + '">',
        '<div>',
        row.image ? '<img class="entry-thumb" src="' + escapeHtml(row.image) + '" alt="">' : '',
        '<span class="card-kicker">' + escapeHtml(row.type.replace(/_/g, " ")) + '</span>',
        '<h3>' + escapeHtml(row.title || "Untitled entry") + '</h3>',
        row.course ? '<p>' + escapeHtml(row.course) + '</p>' : '',
        row.courseMeta ? '<p>' + escapeHtml(row.courseMeta) + '</p>' : '',
        row.detail ? '<p>' + escapeHtml(row.detail) + '</p>' : '',
        '</div>',
        '<div class="entry-actions">',
        '<strong>' + escapeHtml(status) + '</strong>',
        '<button class="button secondary small-button" type="button" data-action="edit" data-row-key="' + escapeHtml(rowKey) + '">Edit</button>',
        '<button class="button secondary small-button danger-button" type="button" data-action="delete" data-row-key="' + escapeHtml(rowKey) + '">Delete</button>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
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
    renderEntries();
  }

  async function refreshMe() {
    if (!state.session) return;
    state.me = await api("/me");
    render();
    if (state.selectedGolferId) {
      await loadEntries();
    }
  }

  async function loadEntries() {
    if (!state.selectedGolferId) {
      state.entries = null;
      renderEntries();
      return;
    }
    state.entries = await api("/dashboard/golfers/" + state.selectedGolferId + "/entries");
    renderEntries();
  }

  function courseToFields(item) {
    var course = item && item.courses ? item.courses : {};
    elements.courseName.value = course.name || "";
    elements.courseCity.value = course.city || "";
    elements.courseState.value = course.state || "";
    elements.courseLatitude.value = course.latitude || "";
    elements.courseLongitude.value = course.longitude || "";
    elements.courseVerificationStatus.value = course.verification_status || "manual";
    elements.courseVerificationSource.value = course.verification_source || "manual_admin";
  }

  function editRow(row) {
    if (!row) return;
    if (row.kind === "photos") {
      clearEntryForm();
      elements.photoCaption.value = row.raw.caption || "";
      elements.photoVisibility.value = row.raw.visibility || "private";
      elements.photoApproved.checked = Boolean(row.raw.is_approved);
      setEditMode({ kind: row.kind, id: row.id, row: row });
      setStatus("Editing photo details. Update the caption, visibility, or approval.");
      return;
    }

    clearPhotoForm();
    var item = row.raw;
    elements.entryType.value = row.type || "memory";
    elements.visibility.value = item.visibility || "private";
    elements.approved.checked = Boolean(item.is_approved);
    courseToFields(item);

    if (row.kind === "memories") {
      elements.entryTitle.value = item.title || "";
      elements.entryStory.value = item.story || "";
      elements.note.value = item.raw_note || "";
      elements.entryTags.value = Array.isArray(item.tags) ? item.tags.join(", ") : "";
    } else if (row.kind === "rounds") {
      elements.entryTitle.value = row.title || "";
      elements.entryStory.value = item.story || "";
      elements.note.value = item.notes || "";
      elements.entryDate.value = item.played_on || "";
      elements.roundScore.value = item.score || "";
      elements.roundHoles.value = item.holes || "";
      elements.roundHighlight.value = item.tees || "";
    } else if (row.kind === "achievements") {
      elements.entryTitle.value = item.title || "";
      elements.entryStory.value = item.story || "";
      elements.entryDate.value = item.achieved_on || "";
      elements.achievementType.value = item.achievement_type || "";
      elements.achievementValue.value = item.value || "";
    } else if (row.kind === "tournaments") {
      elements.entryTitle.value = item.event_name || "";
      elements.entryStory.value = item.story || "";
      elements.entryDate.value = item.played_on || "";
      elements.roundScore.value = item.score || "";
      elements.tournamentName.value = item.event_name || "";
      elements.tournamentDivision.value = item.division || "";
      elements.tournamentFinish.value = item.finish || "";
      elements.tournamentResultUrl.value = item.result_url || "";
    }

    setEditMode({ kind: row.kind, id: row.id, row: row });
    setStatus("Editing saved entry. Update the review fields and click Update Entry.");
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

  async function sendMagicLink() {
    var email = elements.email.value.trim();
    if (!email) throw new Error("Email is required.");
    setAuthStatus("Sending magic link...");
    var result = await client.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard/"
      }
    });
    if (result.error) throw result.error;
    setAuthStatus("Magic link sent. Check that email inbox.");
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
      elements.courseLatitude.value = "";
      elements.courseLongitude.value = "";
      elements.courseVerificationStatus.value = "needs_review";
      elements.courseVerificationSource.value = "unknown";
    }
    if (draft.round) {
      elements.entryDate.value = draft.round.played_on || "";
      elements.roundScore.value = draft.round.score || "";
      elements.roundHoles.value = draft.round.holes || "";
      elements.roundHighlight.value = draft.round.highlight || "";
    }
    if (draft.achievement) {
      elements.achievementType.value = draft.achievement.type || "";
      elements.achievementValue.value = draft.achievement.value || "";
    }
    if (draft.tournament) {
      elements.tournamentName.value = draft.tournament.name || "";
      elements.tournamentDivision.value = draft.tournament.division || "";
      elements.tournamentFinish.value = draft.tournament.finish || "";
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

  function editedCourseStillMatches() {
    var row = state.currentEdit && state.currentEdit.row;
    var course = row && row.raw && row.raw.courses;
    if (!course || !course.id) return null;

    var formStatus = elements.courseVerificationStatus.value || "manual";
    var formSource = elements.courseVerificationSource.value || "manual_admin";
    var matches =
      comparableText(elements.courseName.value) === comparableText(course.name) &&
      comparableText(elements.courseCity.value) === comparableText(course.city) &&
      comparableText(elements.courseState.value) === comparableText(course.state) &&
      comparableNumber(elements.courseLatitude.value) === comparableNumber(course.latitude) &&
      comparableNumber(elements.courseLongitude.value) === comparableNumber(course.longitude) &&
      formStatus === (course.verification_status || "manual") &&
      formSource === (course.verification_source || "manual_admin");

    return matches ? course.id : null;
  }

  async function createCourseIfNeeded() {
    if (!elements.courseName.value.trim()) return null;
    var existingCourseId = editedCourseStillMatches();
    if (existingCourseId) return existingCourseId;

    var coursePayload = await api("/courses", {
      method: "POST",
      body: {
        name: elements.courseName.value.trim(),
        city: elements.courseCity.value.trim(),
        state: elements.courseState.value.trim(),
        country: "United States",
        latitude: optionalNumber(elements.courseLatitude.value),
        longitude: optionalNumber(elements.courseLongitude.value),
        verification_status: elements.courseVerificationStatus.value,
        verification_source: elements.courseVerificationSource.value
      }
    });
    return coursePayload.course.id;
  }

  function baseEntryPayload(courseId) {
    return {
      golfer_id: state.selectedGolferId,
      course_id: courseId,
      visibility: elements.visibility.value,
      is_approved: elements.approved.checked
    };
  }

  async function saveEntry() {
    if (!state.selectedGolferId) {
      throw new Error("Create or select a golfer first.");
    }

    setStatus("Saving entry...");
    var entryType = elements.entryType.value;
    var courseId = await createCourseIfNeeded();
    var base = baseEntryPayload(courseId);

    if (entryType === "round") {
      var roundBody = {
        ...base,
        played_on: elements.entryDate.value,
        score: elements.roundScore.value,
        holes: elements.roundHoles.value,
        tees: elements.roundHighlight.value,
        notes: elements.note.value.trim(),
        story: elements.entryStory.value.trim()
      };
      if (state.currentEdit && state.currentEdit.kind === "rounds") {
        await api("/entries/rounds/" + state.currentEdit.id, { method: "PATCH", body: roundBody });
      } else {
        await api("/rounds", { method: "POST", body: roundBody });
      }
    } else if (entryType === "achievement") {
      var achievementBody = {
        ...base,
        title: elements.entryTitle.value.trim(),
        achievement_type: elements.achievementType.value.trim(),
        achieved_on: elements.entryDate.value,
        value: elements.achievementValue.value.trim(),
        story: elements.entryStory.value.trim()
      };
      if (state.currentEdit && state.currentEdit.kind === "achievements") {
        await api("/entries/achievements/" + state.currentEdit.id, { method: "PATCH", body: achievementBody });
      } else {
        await api("/achievements", { method: "POST", body: achievementBody });
      }
    } else if (entryType === "tournament") {
      var tournamentBody = {
        ...base,
        event_name: elements.tournamentName.value.trim() || elements.entryTitle.value.trim(),
        played_on: elements.entryDate.value,
        division: elements.tournamentDivision.value.trim(),
        score: elements.roundScore.value,
        finish: elements.tournamentFinish.value.trim(),
        result_url: elements.tournamentResultUrl.value.trim(),
        story: elements.entryStory.value.trim()
      };
      if (state.currentEdit && state.currentEdit.kind === "tournaments") {
        await api("/entries/tournaments/" + state.currentEdit.id, { method: "PATCH", body: tournamentBody });
      } else {
        await api("/tournaments", { method: "POST", body: tournamentBody });
      }
    } else {
      var memoryBody = {
        ...base,
        title: elements.entryTitle.value.trim(),
        entry_type: entryType,
        story: elements.entryStory.value.trim(),
        raw_note: elements.note.value.trim(),
        tags: elements.entryTags.value.split(",").map(function (tag) {
          return tag.trim();
        }).filter(Boolean)
      };
      if (state.currentEdit && state.currentEdit.kind === "memories") {
        await api("/entries/memories/" + state.currentEdit.id, { method: "PATCH", body: memoryBody });
      } else {
        await api("/memories", { method: "POST", body: memoryBody });
      }
    }

    clearEntryForm();
    await loadEntries();
    setStatus("Saved. Public entries appear after they are approved and marked public.");
  }

  async function uploadPhoto() {
    if (!state.selectedGolferId) {
      throw new Error("Create or select a golfer first.");
    }
    if (!client) {
      throw new Error("Supabase config did not load.");
    }

    var file = elements.photoFile && elements.photoFile.files ? elements.photoFile.files[0] : null;
    if (state.currentEdit && state.currentEdit.kind === "photos") {
      setStatus("Updating photo...");
      await api("/entries/photos/" + state.currentEdit.id, {
        method: "PATCH",
        body: {
          caption: elements.photoCaption.value.trim(),
          visibility: elements.photoVisibility.value,
          is_approved: elements.photoApproved.checked
        }
      });
      clearPhotoForm();
      await loadEntries();
      setStatus("Photo updated.");
      return;
    }
    if (!file) {
      throw new Error("Choose a photo first.");
    }
    if (!/^image\//.test(file.type || "")) {
      throw new Error("Choose an image file.");
    }

    setStatus("Uploading photo...");
    var path = [
      state.selectedGolferId,
      Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(file.name)
    ].join("/");

    var upload = await client.storage
      .from("passport-photos")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false
      });
    if (upload.error) throw upload.error;

    await api("/photos", {
      method: "POST",
      body: {
        golfer_id: state.selectedGolferId,
        storage_path: upload.data.path,
        caption: elements.photoCaption.value.trim(),
        visibility: elements.photoVisibility.value,
        is_approved: elements.photoApproved.checked
      }
    });

    elements.photoFile.value = "";
    elements.photoCaption.value = "";
    elements.photoApproved.checked = false;
    await loadEntries();
    setStatus("Photo uploaded. Public photos appear after they are approved and marked public.");
  }

  async function deleteRow(row) {
    if (!row) return;
    setStatus("Deleting " + row.type.replace(/_/g, " ") + "...");
    await api("/entries/" + row.kind + "/" + row.id, { method: "DELETE" });
    if (state.currentEdit && state.currentEdit.id === row.id && state.currentEdit.kind === row.kind) {
      clearEntryForm();
      clearPhotoForm();
    }
    await loadEntries();
    setStatus("Deleted.");
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
  bind(elements.magicLink, sendMagicLink, setAuthStatus);
  bind(elements.updatePassword, updatePassword);
  bind(elements.createGolfer, createGolfer);
  bind(elements.parseResult, parsePastedResult);
  bind(elements.draftWithAi, draftWithAi);
  bind(elements.saveEntry, saveEntry);
  bind(elements.uploadPhoto, uploadPhoto);

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
      state.entries = null;
      renderEntries();
      loadEntries().catch(function (error) {
        setStatus(error.message);
      });
    });
  }

  if (elements.entryList) {
    elements.entryList.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var row = state.renderedRows[button.getAttribute("data-row-key")];
      if (button.getAttribute("data-action") === "edit") {
        editRow(row);
        return;
      }
      if (button.getAttribute("data-action") === "delete") {
        deleteRow(row).catch(function (error) {
          setStatus(error.message);
        });
      }
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
