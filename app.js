(function () {
  var shareButton = document.getElementById("share-button");
  var shareStatus = document.getElementById("share-status");
  var config = window.JGP_CONFIG;
  var supabaseFactory = window.supabase;
  var authClient = config && supabaseFactory
    ? supabaseFactory.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;
  var profileState = {
    session: null,
    me: null,
    editableGolfer: null,
    features: null,
    courseCandidate: null
  };
  var quick = {
    open: document.getElementById("quick-add-open"),
    signIn: document.getElementById("profile-sign-in-link"),
    backdrop: document.getElementById("quick-add-backdrop"),
    close: document.getElementById("quick-add-close"),
    compose: document.getElementById("quick-add-compose"),
    ownAiPanel: document.getElementById("quick-own-ai-panel"),
    reviewPanel: document.getElementById("quick-review-panel"),
    date: document.getElementById("quick-add-date"),
    course: document.getElementById("quick-add-course"),
    note: document.getElementById("quick-add-note"),
    photo: document.getElementById("quick-add-photo"),
    photoPreview: document.getElementById("quick-photo-preview"),
    saveManual: document.getElementById("quick-save-manual"),
    draftAi: document.getElementById("quick-draft-ai"),
    ownAi: document.getElementById("quick-own-ai"),
    prompt: document.getElementById("quick-ai-prompt"),
    copyPrompt: document.getElementById("quick-copy-prompt"),
    aiResult: document.getElementById("quick-ai-result"),
    parseAi: document.getElementById("quick-parse-ai"),
    backCompose: document.getElementById("quick-back-compose"),
    editCompose: document.getElementById("quick-edit-compose"),
    reviewCourse: document.getElementById("quick-review-course"),
    reviewCity: document.getElementById("quick-review-city"),
    reviewState: document.getElementById("quick-review-state"),
    reviewStory: document.getElementById("quick-review-story"),
    reviewCaption: document.getElementById("quick-review-caption"),
    reviewVisibility: document.getElementById("quick-review-visibility"),
    reviewApproved: document.getElementById("quick-review-approved"),
    saveReview: document.getElementById("quick-save-review"),
    status: document.getElementById("quick-add-status")
  };

  function uniqueBy(items, keyFn) {
    var seen = {};
    return items.filter(function (item) {
      var key = keyFn(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setText(node, value) {
    if (node) node.textContent = value || "";
  }

  function setHidden(node, hidden) {
    if (node) node.hidden = Boolean(hidden);
  }

  function setQuickStatus(message) {
    setText(quick.status, message);
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + profileState.session.access_token,
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
    if (!response.ok) throw new Error(payload.error || "Request failed");
    return payload;
  }

  async function publicApi(path) {
    var response = await fetch(config.passportApiBaseUrl + path);
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) throw new Error(payload.error || "API request failed");
    return payload;
  }

  function coursePlace(course) {
    return [course.city, course.state].filter(Boolean).join(", ");
  }

  function courseVerificationLabel(course) {
    var hasPin = Number.isFinite(Number(course.latitude)) && Number.isFinite(Number(course.longitude));
    var status = String(course.verification_status || "manual").replace(/_/g, " ");
    return hasPin ? status + " pin" : status;
  }

  function emptyCard(message) {
    return '<p class="empty-state">' + escapeHtml(message) + "</p>";
  }

  function golferFirstName(golfer) {
    return String(golfer && golfer.display_name || "This golfer").split(" ")[0] || "This golfer";
  }

  function initialsForName(name) {
    return String(name || "JGP")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("") || "J";
  }

  function recordCourse(record) {
    return record && record.courses ? record.courses : null;
  }

  function collectCourses(data) {
    var records = []
      .concat(data.rounds || [])
      .concat(data.memories || [])
      .concat(data.achievements || [])
      .concat(data.tournaments || []);
    return uniqueBy(records.map(recordCourse).filter(Boolean), function (course) {
      return course.id || [course.name, course.city, course.state].join("|");
    });
  }

  function stateCode(course) {
    return String(course && course.state || "GP").slice(0, 2).toUpperCase();
  }

  function renderCourseCards(courses, golfer) {
    var grid = document.querySelector(".course-card-grid");
    if (!grid) return;

    if (!courses.length) {
      grid.innerHTML = emptyCard("Approved course stamps will appear here as " + golferFirstName(golfer) + " builds this passport.");
      return;
    }

    grid.innerHTML = courses.map(function (course) {
      return [
        "<article>",
        "<span>" + escapeHtml(stateCode(course)) + "</span>",
        "<h3>" + escapeHtml(course.name) + "</h3>",
        "<p>" + escapeHtml(coursePlace(course)) + "</p>",
        '<p class="course-verification">' + escapeHtml(courseVerificationLabel(course)) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderMemories(memories, golfer) {
    var timeline = document.querySelector(".timeline");
    if (!timeline) return;

    if (!memories.length) {
      timeline.innerHTML = emptyCard("Approved memories will appear here after " + golferFirstName(golfer) + " saves the first public story.");
      return;
    }

    timeline.innerHTML = memories.map(function (memory) {
      var label = memory.entry_type === "course_played" ? "Passport stamp" : "Memory";
      return [
        "<article>",
        '<span class="timeline-date">' + escapeHtml(label) + "</span>",
        "<h3>" + escapeHtml(memory.title) + "</h3>",
        "<p>" + escapeHtml(memory.story || "") + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderAchievements(achievements, golfer, courses) {
    var grid = document.querySelector(".achievement-grid");
    if (!grid) return;

    if (!achievements.length) {
      if (courses && courses.length) {
        var states = uniqueBy(courses, function (course) {
          return course.state;
        });
        var pinned = courses.filter(function (course) {
          return Number.isFinite(Number(course.latitude)) && Number.isFinite(Number(course.longitude));
        });
        grid.innerHTML = [
          '<article><span>' + escapeHtml(String(states.length)) + '</span><strong>States played</strong><p>' +
            escapeHtml(states.map(function (course) { return course.state; }).filter(Boolean).join(", ")) +
            ' are stamped on the map.</p></article>',
          '<article><span>' + escapeHtml(String(courses.length)) + '</span><strong>Courses played</strong><p>Current approved course log total.</p></article>',
          '<article><span>' + escapeHtml(String(pinned.length)) + '</span><strong>Mapped pins</strong><p>Verified course locations are ready for the map.</p></article>'
        ].join("");
        return;
      }
      grid.innerHTML = emptyCard("Milestones, personal bests, and firsts will appear here once approved.");
      return;
    }

    grid.innerHTML = achievements.map(function (achievement) {
      var badge = String(achievement.value || achievement.achievement_type || "A").slice(0, 2).toUpperCase();
      return [
        "<article>",
        "<span>" + escapeHtml(badge) + "</span>",
        "<strong>" + escapeHtml(achievement.title) + "</strong>",
        "<p>" + escapeHtml(achievement.story || achievement.value || "") + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderTournaments(tournaments, golfer) {
    var list = document.querySelector(".tournament-list");
    if (!list) return;

    if (!tournaments.length) {
      list.innerHTML = emptyCard("Tournament history is ready when " + golferFirstName(golfer) + " has an approved result to share.");
      return;
    }

    list.innerHTML = tournaments.map(function (tournament) {
      var details = [tournament.division, tournament.score, tournament.story].filter(Boolean).join(" - ");
      return [
        "<article>",
        "<div>",
        "<h3>" + escapeHtml(tournament.event_name) + "</h3>",
        "<p>" + escapeHtml(details || "Tournament result saved to this passport.") + "</p>",
        "</div>",
        '<div class="result">' + escapeHtml(tournament.finish || "Saved") + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderPhotos(photos, golfer) {
    var grid = document.querySelector("#photos .memory-grid");
    if (!grid) return;

    if (!photos.length) {
      grid.innerHTML = emptyCard("Approved photos and captions will collect here as the scrapbook grows.");
      return;
    }

    grid.innerHTML = photos.map(function (photo) {
      var caption = photo.caption || "Passport photo";
      return [
        "<article>",
        photo.signed_url
          ? '<img src="' + escapeHtml(photo.signed_url) + '" alt="' + escapeHtml(caption) + '">'
          : '<div class="memory-placeholder">Photo</div>',
        "<div>",
        "<h3>" + escapeHtml(caption) + "</h3>",
        "<p>Saved to " + escapeHtml(golferFirstName(golfer)) + "'s Junior Golf Passport.</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderGolferProfile(golfer) {
    if (!golfer) return;
    var name = document.querySelector(".profile-summary h1");
    var eyebrow = document.querySelector(".profile-summary .eyebrow");
    var meta = document.querySelector(".profile-meta");
    var bio = document.querySelector(".profile-summary .profile-bio");
    var photo = document.querySelector(".profile-photo");

    if (name && golfer.display_name) name.textContent = golfer.display_name;
    if (eyebrow && golfer.display_name) eyebrow.textContent = golfer.display_name + "'s Junior Golf Passport";
    if (meta && golfer.headline) meta.textContent = golfer.headline;
    if (bio && golfer.bio) bio.textContent = golfer.bio;
    if (photo && golfer.display_name) photo.textContent = initialsForName(golfer.display_name);
    if (golfer.display_name) {
      document.title = golfer.display_name + " | Junior Golf Passport";
    }
  }

  function renderGoals(goals, golfer) {
    var list = document.querySelector(".goal-list");
    if (!list) return;

    if (!goals.length) {
      list.innerHTML = emptyCard("Goals will appear here when " + golferFirstName(golfer) + " approves the next target.");
      return;
    }

    list.innerHTML = goals.map(function (goal) {
      return [
        "<article>",
        "<strong>" + escapeHtml(goal.title) + "</strong>",
        "<span>" + escapeHtml(goal.progress_label || goal.description || goal.status || "Active") + "</span>",
        goal.description && goal.progress_label ? "<p>" + escapeHtml(goal.description) + "</p>" : "",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderStats(data) {
    var stats = document.querySelector(".profile-stats");
    if (!stats) return;

    var courses = collectCourses(data);
    var states = uniqueBy(courses, function (course) {
      return course.state;
    });
    var memories = data.memories || [];
    var photos = data.photos || [];

    stats.innerHTML = [
      "<div><strong>" + courses.length + "</strong><span>Courses played</span></div>",
      "<div><strong>" + states.length + "</strong><span>States stamped</span></div>",
      "<div><strong>" + courses.filter(function (course) {
        return Number.isFinite(Number(course.latitude)) && Number.isFinite(Number(course.longitude));
      }).length + "</strong><span>Mapped pins</span></div>",
      "<div><strong>" + (memories.length + photos.length) + "</strong><span>Saved memories</span></div>"
    ].join("");
  }

  function renderMapNotes(courses, golfer) {
    var notes = document.querySelector(".map-notes");
    if (!notes) return;

    if (!courses.length) {
      notes.innerHTML = [
        "<article>",
        "<strong>Map waiting for first stamp</strong>",
        "<span>No public courses yet</span>",
        "<p>Once " + escapeHtml(golferFirstName(golfer)) + " approves a course-backed entry, it can appear on this passport.</p>",
        "</article>"
      ].join("");
      return;
    }

    var byState = courses.reduce(function (result, course) {
      var key = course.state || "Unlisted";
      result[key] = result[key] || [];
      result[key].push(course);
      return result;
    }, {});

    notes.innerHTML = Object.keys(byState).sort().slice(0, 6).map(function (state) {
      var stateCourses = byState[state];
      return [
        "<article>",
        "<strong>" + escapeHtml(state) + "</strong>",
        "<span>" + stateCourses.length + " course" + (stateCourses.length === 1 ? "" : "s") + "</span>",
        "<p>" + escapeHtml(stateCourses.map(function (course) {
          return course.name;
        }).join(", ")) + "</p>",
        "</article>"
      ].join("");
    }).join("") + (currentPassportSlug() === "kara"
      ? '<a class="button primary" href="/Kara/map/">Open Full Interactive Map</a>'
      : "");
  }

  function currentPassportSlug() {
    var explicitSlug = document.body.getAttribute("data-golfer-slug");
    if (explicitSlug) return explicitSlug;

    var params = new URLSearchParams(window.location.search);
    return params.get("golfer") || params.get("slug") || "";
  }

  function currentGolferRow() {
    var slug = currentPassportSlug();
    var rows = profileState.me && Array.isArray(profileState.me.golfers) ? profileState.me.golfers : [];
    return rows.find(function (row) {
      return row.golfers && row.golfers.slug === slug;
    });
  }

  function canEditCurrentGolfer() {
    if (!profileState.me || !profileState.me.profile) return false;
    if (profileState.me.profile.must_change_password) return false;
    if (profileState.me.profile.role === "admin") return Boolean(profileState.editableGolfer);
    return Boolean(currentGolferRow());
  }

  function renderEditControls() {
    var canEdit = canEditCurrentGolfer();
    setHidden(quick.open, !canEdit);
    setHidden(quick.signIn, canEdit);
  }

  async function loadProfileAuth() {
    if (!authClient || !config || !document.body.classList.contains("profile-page")) return;
    var sessionResult = await authClient.auth.getSession();
    profileState.session = sessionResult.data.session;
    if (!profileState.session) {
      renderEditControls();
      return;
    }
    try {
      profileState.me = await api("/me");
      profileState.features = await publicApi("/features").catch(function () {
        return null;
      });
      var row = currentGolferRow();
      profileState.editableGolfer = row && row.golfers ? row.golfers : null;
      if (!profileState.editableGolfer && profileState.me.profile && profileState.me.profile.role === "admin") {
        var slug = currentPassportSlug();
        var adminRows = profileState.me.golfers || [];
        var adminRow = adminRows.find(function (item) {
          return item.golfers && item.golfers.slug === slug;
        });
        profileState.editableGolfer = adminRow && adminRow.golfers ? adminRow.golfers : null;
      }
      renderEditControls();
    } catch (error) {
      renderEditControls();
    }
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function coursePartsFromText(value) {
    var parts = String(value || "").split(",").map(function (part) {
      return part.trim();
    }).filter(Boolean);
    return {
      name: parts[0] || String(value || "").trim(),
      city: parts[1] || "",
      state: parts[2] || ""
    };
  }

  function quickDraftSourceNote() {
    var context = [];
    if (quick.date && quick.date.value) context.push("Date: " + quick.date.value);
    if (quick.course && quick.course.value.trim()) context.push("Course: " + quick.course.value.trim());
    var note = quick.note ? quick.note.value.trim() : "";
    return context.concat(note ? ["Story note: " + note] : []).join("\n");
  }

  function freeAiPrompt(note) {
    return [
      "You are helping turn a junior golfer's rough golf note into a structured Junior Golf Passport entry.",
      "",
      "Return only valid JSON. Do not include markdown. Do not include comments.",
      "If you are unsure about a value, use null and add a question in the questions array.",
      "Do not invent scores, dates, exact course identities, or locations.",
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
      '  "story": "polished public-friendly story draft",',
      '  "tags": ["tag one", "tag two"],',
      '  "visibility": "private",',
      '  "course_lookup_query": "course name city state country for later map verification, or null",',
      '  "confidence": "high | medium | low",',
      '  "questions": ["question one if needed"]',
      "}"
    ].join("\n");
  }

  function showQuickPanel(panel) {
    setHidden(quick.compose, panel !== "compose");
    setHidden(quick.ownAiPanel, panel !== "own-ai");
    setHidden(quick.reviewPanel, panel !== "review");
  }

  function openQuickAdd() {
    if (!canEditCurrentGolfer()) return;
    if (quick.date && !quick.date.value) quick.date.value = todayIso();
    if (quick.reviewCaption) quick.reviewCaption.value = "";
    profileState.courseCandidate = null;
    setQuickStatus("");
    setHidden(quick.backdrop, false);
    showQuickPanel("compose");
    if (quick.note) quick.note.focus();
  }

  function closeQuickAdd() {
    setHidden(quick.backdrop, true);
    setQuickStatus("");
  }

  async function lookupBestCourse(course) {
    var name = course && course.name ? course.name : "";
    if (!name) return null;
    try {
      var payload = await api("/courses/lookup", {
        method: "POST",
        body: {
          golfer_id: profileState.editableGolfer.id,
          name: name,
          city: course.city || "",
          state: course.state || "",
          country: "United States"
        }
      });
      return payload.candidates && payload.candidates[0] ? payload.candidates[0] : null;
    } catch (error) {
      return null;
    }
  }

  function comparable(value) {
    return String(value || "").trim().toLowerCase();
  }

  function candidateStillMatches(candidate) {
    if (!candidate) return false;
    return comparable(candidate.name) === comparable(quick.reviewCourse.value) &&
      comparable(candidate.city) === comparable(quick.reviewCity.value) &&
      comparable(candidate.state) === comparable(quick.reviewState.value);
  }

  async function prepareReview(draft) {
    var noteCourse = coursePartsFromText(quick.course ? quick.course.value : "");
    var draftCourse = draft && draft.course && draft.course.name ? draft.course : null;
    var course = draftCourse || noteCourse;
    var story = draft && draft.story ? draft.story : (quick.note ? quick.note.value.trim() : "");
    if (!story) {
      throw new Error("Add a story before reviewing.");
    }
    var candidate = await lookupBestCourse(course);
    profileState.courseCandidate = candidate;

    quick.reviewCourse.value = candidate && candidate.name ? candidate.name : (course.name || "");
    quick.reviewCity.value = candidate && candidate.city ? candidate.city : (course.city || "");
    quick.reviewState.value = candidate && candidate.state ? candidate.state : (course.state || "");
    quick.reviewStory.value = story;
    quick.reviewCaption.value = quick.reviewCaption.value || "";
    quick.reviewVisibility.value = "private";
    quick.reviewApproved.checked = false;
    setQuickStatus(candidate ? "Course verified with Google Places." : "Review the story before saving.");
    showQuickPanel("review");
  }

  async function draftWithBuiltInAi() {
    if (!profileState.features || !profileState.features.built_in_ai_configured) {
      throw new Error("Built-in AI is not configured.");
    }
    if (!profileState.me.profile.has_ai_access) {
      throw new Error("This account does not have built-in AI access.");
    }
    setQuickStatus("Drafting with AI...");
    var payload = await api("/ai/draft-entry", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        note: quickDraftSourceNote()
      }
    });
    await prepareReview(payload.draft || {});
  }

  async function parseOwnAiResult() {
    setQuickStatus("Parsing AI result...");
    var payload = await api("/ai/parse-pasted-result", {
      method: "POST",
      body: { result: quick.aiResult.value }
    });
    await prepareReview(payload.draft || {});
  }

  async function createCourseFromReview() {
    var name = quick.reviewCourse.value.trim();
    if (!name) return null;
    var candidate = candidateStillMatches(profileState.courseCandidate) ? profileState.courseCandidate : null;
    var payload = await api("/courses", {
      method: "POST",
      body: {
        name: name,
        city: quick.reviewCity.value.trim(),
        state: quick.reviewState.value.trim(),
        country: "United States",
        latitude: candidate ? candidate.latitude : null,
        longitude: candidate ? candidate.longitude : null,
        verification_status: candidate ? "verified" : "manual",
        verification_source: candidate ? "google_places" : "manual_admin",
        source_place_id: candidate ? candidate.source_place_id : ""
      }
    });
    return payload.course.id;
  }

  function memoryTitle() {
    if (quick.reviewCourse.value.trim()) return quick.reviewCourse.value.trim() + " memory";
    var text = quick.reviewStory.value.trim() || "Golf memory";
    return text.slice(0, 70);
  }

  function safeFileName(value) {
    return String(value || "photo")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "photo";
  }

  async function uploadQuickPhoto(memoryId) {
    var file = quick.photo && quick.photo.files ? quick.photo.files[0] : null;
    if (!file) return;
    var path = [
      profileState.editableGolfer.id,
      Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(file.name)
    ].join("/");
    var upload = await authClient.storage
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
        golfer_id: profileState.editableGolfer.id,
        storage_path: path,
        caption: quick.reviewCaption.value.trim(),
        linked_type: "memory",
        linked_id: memoryId,
        visibility: quick.reviewVisibility.value,
        is_approved: quick.reviewApproved.checked
      }
    });
  }

  async function saveQuickReview() {
    setQuickStatus("Saving memory...");
    var courseId = await createCourseFromReview();
    var payload = await api("/memories", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        course_id: courseId,
        title: memoryTitle(),
        entry_type: courseId ? "course_played" : "memory",
        story: quick.reviewStory.value.trim(),
        raw_note: quick.note.value.trim(),
        tags: [],
        visibility: quick.reviewVisibility.value,
        is_approved: quick.reviewApproved.checked
      }
    });
    await uploadQuickPhoto(payload.memory.id);
    setQuickStatus("Saved.");
    window.setTimeout(function () {
      window.location.reload();
    }, 650);
  }

  function bindQuickAdd() {
    if (!quick.open) return;
    quick.open.addEventListener("click", openQuickAdd);
    if (quick.close) quick.close.addEventListener("click", closeQuickAdd);
    if (quick.backdrop) {
      quick.backdrop.addEventListener("click", function (event) {
        if (event.target === quick.backdrop) closeQuickAdd();
      });
    }
    if (quick.photo) {
      quick.photo.addEventListener("change", function () {
        var file = quick.photo.files && quick.photo.files[0];
        setText(quick.photoPreview, file ? file.name : "Add an optional photo");
        if (quick.photoPreview) {
          quick.photoPreview.style.backgroundImage = file ? "url(" + URL.createObjectURL(file) + ")" : "";
          quick.photoPreview.classList.toggle("has-image", Boolean(file));
        }
      });
    }
    if (quick.saveManual) {
      quick.saveManual.addEventListener("click", function () {
        prepareReview({}).catch(function (error) {
          setQuickStatus(error.message);
        });
      });
    }
    if (quick.draftAi) {
      quick.draftAi.addEventListener("click", function () {
        draftWithBuiltInAi().catch(function (error) {
          setQuickStatus(error.message);
        });
      });
    }
    if (quick.ownAi) {
      quick.ownAi.addEventListener("click", function () {
        quick.prompt.value = freeAiPrompt(quickDraftSourceNote());
        showQuickPanel("own-ai");
      });
    }
    if (quick.copyPrompt) {
      quick.copyPrompt.addEventListener("click", function () {
        navigator.clipboard.writeText(quick.prompt.value).then(function () {
          setQuickStatus("Prompt copied.");
        }).catch(function () {
          setQuickStatus("Copy failed. Select and copy the prompt manually.");
        });
      });
    }
    if (quick.backCompose) quick.backCompose.addEventListener("click", function () { showQuickPanel("compose"); });
    if (quick.editCompose) quick.editCompose.addEventListener("click", function () { showQuickPanel("compose"); });
    if (quick.parseAi) {
      quick.parseAi.addEventListener("click", function () {
        parseOwnAiResult().catch(function (error) {
          setQuickStatus(error.message);
        });
      });
    }
    if (quick.saveReview) {
      quick.saveReview.addEventListener("click", function () {
        saveQuickReview().catch(function (error) {
          setQuickStatus(error.message);
        });
      });
    }
  }

  function renderPublicPassport(data) {
    var golfer = data.golfer || {};
    var normalized = {
      golfer: golfer,
      rounds: Array.isArray(data.rounds) ? data.rounds : [],
      memories: Array.isArray(data.memories) ? data.memories : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
      photos: Array.isArray(data.photos) ? data.photos : [],
      goals: Array.isArray(data.goals) ? data.goals : []
    };
    var courses = collectCourses(normalized);

    renderGolferProfile(golfer);
    renderStats(normalized);
    renderCourseCards(courses, golfer);
    renderMapNotes(courses, golfer);
    renderMemories(normalized.memories, golfer);
    renderAchievements(normalized.achievements, golfer, courses);
    renderTournaments(normalized.tournaments, golfer);
    renderPhotos(normalized.photos, golfer);
    renderGoals(normalized.goals, golfer);
  }

  function renderPassportError(message) {
    var main = document.querySelector("main");
    if (!main) return;
    main.innerHTML = [
      '<section class="profile-section">',
      '<div class="section-heading compact-heading">',
      '<p class="eyebrow">Passport unavailable</p>',
      "<h1>We could not load this passport.</h1>",
      "<p>" + escapeHtml(message) + "</p>",
      '<a class="button primary" href="/">Return Home</a>',
      "</div>",
      "</section>"
    ].join("");
  }

  function loadPublicPassport() {
    if (!config || !document.body.classList.contains("profile-page")) return;
    var slug = currentPassportSlug();
    if (!slug) {
      renderPassportError("This public passport link is missing a golfer name.");
      return;
    }

    fetch(config.passportApiBaseUrl + "/golfers/" + encodeURIComponent(slug) + "/public")
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load live passport.");
        return response.json();
      })
      .then(renderPublicPassport)
      .catch(function () {
        if (document.body.classList.contains("generic-profile-page")) {
          renderPassportError("This passport may be private, unlisted with a different link, or not created yet.");
        }
        // Keep the static passport visible if the live API is unavailable.
      });
  }

  if (shareButton) {
    shareButton.addEventListener("click", function () {
      var url = window.location.href;

      if (navigator.share) {
        navigator.share({
          title: document.title || "Junior Golf Passport",
          text: "View this Junior Golf Passport.",
          url: url
        }).catch(function () {});
        return;
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          if (shareStatus) {
            shareStatus.textContent = "Profile link copied.";
          }
        });
        return;
      }

      if (shareStatus) {
        shareStatus.textContent = url;
      }
    });
  }

  bindQuickAdd();
  loadPublicPassport();
  loadProfileAuth();
})();
