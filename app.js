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
    courseCandidate: null,
    publicPassport: null,
    ownerEntries: null,
    selectedState: "",
    selectedCourseKey: "",
    editingEntry: null,
    editingPhoto: null,
    addingPhotoToEntry: null,
    baseReviewTags: [],
    reviewTags: [],
    profilePhotoSaving: false,
    quickPhotoPreviewUrl: "",
    reviewPhotoPreviewUrl: ""
  };
  var quick = {
    open: document.getElementById("quick-add-open"),
    signIn: document.getElementById("profile-sign-in-link"),
    backdrop: document.getElementById("quick-add-backdrop"),
    close: document.getElementById("quick-add-close"),
    compose: document.getElementById("quick-add-compose"),
    ownAiPanel: document.getElementById("quick-own-ai-panel"),
    reviewPanel: document.getElementById("quick-review-panel"),
    photoEditPanel: document.getElementById("quick-photo-edit-panel"),
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
    reviewDate: document.getElementById("quick-review-date"),
    reviewTitle: document.getElementById("quick-review-title"),
    reviewStory: document.getElementById("quick-review-story"),
    ribbons: document.getElementById("quick-ribbon-suggestions"),
    reviewCaption: document.getElementById("quick-review-caption"),
    reviewPhoto: document.getElementById("quick-review-photo"),
    reviewPhotoPreview: document.getElementById("quick-review-photo-preview"),
    reviewVisibility: document.getElementById("quick-review-visibility"),
    reviewApproved: document.getElementById("quick-review-approved"),
    saveReview: document.getElementById("quick-save-review"),
    photoEditCaption: document.getElementById("quick-photo-edit-caption"),
    photoEditFile: document.getElementById("quick-photo-edit-file"),
    photoEditVisibility: document.getElementById("quick-photo-edit-visibility"),
    photoEditApproved: document.getElementById("quick-photo-edit-approved"),
    photoEditCancel: document.getElementById("quick-photo-edit-cancel"),
    photoEditSave: document.getElementById("quick-photo-edit-save"),
    photoEditStatus: document.getElementById("quick-photo-edit-status"),
    photoEditHeading: document.getElementById("quick-photo-edit-heading"),
    photoEditLabel: document.getElementById("quick-photo-edit-label"),
    photoEditHint: document.getElementById("quick-photo-edit-hint"),
    status: document.getElementById("quick-add-status")
  };
  var profileUi = {
    photoButton: document.getElementById("profile-photo-button"),
    photoInput: document.getElementById("profile-photo-input"),
    photoModal: document.getElementById("profile-photo-modal"),
    photoModalClose: document.getElementById("profile-photo-modal-close"),
    photoModalImage: document.getElementById("profile-photo-modal-image"),
    photoModalName: document.getElementById("profile-photo-modal-name"),
    photoModalMeta: document.getElementById("profile-photo-modal-meta"),
    photoModalBio: document.getElementById("profile-photo-modal-bio")
  };
  var PROFILE_PHOTO_CAPTION = "Profile photo";
  var MAX_PHOTO_DIMENSION = 1600;
  var PHOTO_JPEG_QUALITY = 0.82;
  var PROFILE_PHOTO_CACHE_MAX_AGE_MS = 45 * 60 * 1000;

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

  function setPhotoEditStatus(message) {
    setText(quick.photoEditStatus, message);
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

  var stateCodeByName = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY"
  };

  function courseVerificationLabel(course) {
    var hasPin = Number.isFinite(Number(course.latitude)) && Number.isFinite(Number(course.longitude));
    var status = String(course.verification_status || "manual").replace(/_/g, " ");
    return hasPin ? status + " pin" : status;
  }

  function emptyCard(message) {
    return '<p class="empty-state">' + escapeHtml(message) + "</p>";
  }

  function uniqueStrings(items) {
    var seen = {};
    return (items || []).map(function (item) {
      return String(item || "").trim();
    }).filter(function (item) {
      var key = item.toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
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

  function isProfilePhoto(photo) {
    if (!photo) return false;
    return String(photo.caption || "").trim().toLowerCase() === PROFILE_PHOTO_CAPTION.toLowerCase() ||
      String(photo.storage_path || "").indexOf("/profile/") !== -1;
  }

  function profilePhotoFromData(data) {
    var photos = data && Array.isArray(data.photos) ? data.photos : [];
    return photos.find(isProfilePhoto) || null;
  }

  function setProfilePhotoElement(element, golfer, photo) {
    if (!element) return;
    var initials = initialsForName(golfer && golfer.display_name);
    element.textContent = initials;
    element.style.backgroundImage = "";
    element.classList.remove("has-image");
    if (photo && photo.signed_url) {
      element.textContent = "";
      element.style.backgroundImage = 'url("' + String(photo.signed_url).replace(/"/g, "%22") + '")';
      element.classList.add("has-image");
    }
  }

  function profilePhotoCacheKey() {
    return "jgp_pp_" + (currentPassportSlug() || "kara");
  }

  function applyProfilePhotoCache() {
    try {
      var raw = localStorage.getItem(profilePhotoCacheKey());
      if (!raw) return;
      var cached = JSON.parse(raw);
      if (!cached || !cached.url || !cached.ts) return;
      if (Date.now() - cached.ts > PROFILE_PHOTO_CACHE_MAX_AGE_MS) return;
      var el = profileUi.photoButton;
      if (!el || el.classList.contains("has-image")) return;
      el.textContent = "";
      el.style.backgroundImage = 'url("' + String(cached.url).replace(/"/g, "%22") + '")';
      el.classList.add("has-image");
    } catch (e) {}
  }

  function saveProfilePhotoCache(signedUrl) {
    try {
      if (!signedUrl) return;
      localStorage.setItem(profilePhotoCacheKey(), JSON.stringify({ url: signedUrl, ts: Date.now() }));
    } catch (e) {}
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
    return normalizeStateCode(course && course.state);
  }

  function normalizeStateCode(value) {
    var text = String(value || "").trim();
    if (!text) return "GP";
    if (text.length === 2) return text.toUpperCase();
    return stateCodeByName[text.toLowerCase()] || text.slice(0, 2).toUpperCase();
  }

  function courseKey(course) {
    if (!course) return "";
    return course.id || [
      comparable(course.name),
      comparable(course.city),
      normalizeStateCode(course.state)
    ].join("|");
  }

  function recordMatchesCourse(record, course) {
    var recordCourseValue = recordCourse(record);
    return courseKey(recordCourseValue) === courseKey(course);
  }

  function dateLabel(record) {
    return record.played_on || record.achieved_on || record.occurred_on || record.created_at || record.updated_at || "";
  }

  function entryLabel(kind, record) {
    if (kind === "rounds") return "Round";
    if (kind === "achievements") return "Achievement";
    if (kind === "tournaments") return "Tournament";
    if (record && record.entry_type === "course_played") return "Passport stamp";
    return "Memory";
  }

  function courseEntries(course, data) {
    var groups = [
      { kind: "memories", records: data.memories || [] },
      { kind: "rounds", records: data.rounds || [] },
      { kind: "achievements", records: data.achievements || [] },
      { kind: "tournaments", records: data.tournaments || [] }
    ];
    return groups.reduce(function (entries, group) {
      group.records.forEach(function (record) {
        if (!recordMatchesCourse(record, course)) return;
        entries.push({
          kind: group.kind,
          record: record,
          label: entryLabel(group.kind, record),
          title: record.title || record.event_name || record.courses && record.courses.name || course.name,
          story: record.story || record.notes || record.value || record.finish || "",
          date: dateLabel(record)
        });
      });
      return entries;
    }, []).sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  function photosForEntries(entries, data) {
    var entryIds = entries.map(function (entry) {
      return entry.record && entry.record.id;
    }).filter(Boolean);
    return (data.photos || []).filter(function (photo) {
      return photo.linked_type && photo.linked_id && entryIds.includes(photo.linked_id);
    });
  }

  function linkedTypeForEntryKind(kind) {
    return {
      rounds: "round",
      memories: "memory",
      achievements: "achievement",
      tournaments: "tournament"
    }[kind] || "memory";
  }

  function photosForEntry(entry) {
    var data = profileState.publicPassport;
    if (!data || !entry || !entry.record || !entry.record.id) return [];
    var linkedType = linkedTypeForEntryKind(entry.kind);
    return (data.photos || []).filter(function (photo) {
      return !isProfilePhoto(photo) &&
        photo.linked_id === entry.record.id &&
        (!photo.linked_type || photo.linked_type === linkedType);
    });
  }

  function renderStateFilters(courses) {
    var row = document.querySelector(".course-chip-row");
    if (!row) return;
    var states = uniqueBy(courses, function (course) {
      return normalizeStateCode(course.state);
    }).sort(function (a, b) {
      return normalizeStateCode(a.state).localeCompare(normalizeStateCode(b.state));
    });
    if (!states.length) {
      row.innerHTML = "";
      return;
    }
    row.innerHTML = [
      '<button type="button" class="' + (profileState.selectedState ? "" : "is-active") + '" data-state-filter="">All</button>'
    ].concat(states.map(function (course) {
      var code = normalizeStateCode(course.state);
      return '<button type="button" class="' + (profileState.selectedState === code ? "is-active" : "") +
        '" data-state-filter="' + escapeHtml(code) + '">' + escapeHtml(code) + '</button>';
    })).join("");
  }

  function editableKind(kind) {
    return ["memories", "rounds", "achievements", "tournaments"].includes(kind);
  }

  function renderCourseCards(courses, golfer) {
    var grid = document.querySelector(".course-card-grid");
    if (!grid) return;

    if (!courses.length) {
      grid.innerHTML = emptyCard("Approved course stamps will appear here as " + golferFirstName(golfer) + " builds this passport.");
      return;
    }

    renderStateFilters(courses);
    var visibleCourses = profileState.selectedState
      ? courses.filter(function (course) { return normalizeStateCode(course.state) === profileState.selectedState; })
      : courses;
    if (!visibleCourses.some(function (course) { return courseKey(course) === profileState.selectedCourseKey; })) {
      profileState.selectedCourseKey = profileState.selectedState ? "" : (visibleCourses[0] ? courseKey(visibleCourses[0]) : "");
    }

    grid.innerHTML = visibleCourses.map(function (course) {
      var selected = courseKey(course) === profileState.selectedCourseKey;
      return [
        '<article class="' + (selected ? "is-selected" : "") + '">',
        "<span>" + escapeHtml(stateCode(course)) + "</span>",
        "<div>",
        "<h3>" + escapeHtml(course.name) + "</h3>",
        "<p>" + escapeHtml(coursePlace(course)) + "</p>",
        '<p class="course-verification">' + escapeHtml(courseVerificationLabel(course)) + "</p>",
        '<button class="course-select-button" type="button" data-course-key="' + escapeHtml(courseKey(course)) + '">View Stories</button>',
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  var STAMP_MAP = {
    "new state": "new-state",
    "first birdie": "first-birdie",
    "first eagle": "first-eagle",
    "hole in one": "hole-in-one",
    "broke 100": "broke-100",
    "broke 90": "broke-90",
    "broke 80": "broke-80",
    "broke 70": "broke-70",
    "personal best": "personal-best",
    "tournament moment": "tournament",
    "memorable drive": "memorable-drive"
  };

  function stampForEntry(entry) {
    var record = entry.record;
    var tags = Array.isArray(record.tags) ? record.tags : [];
    for (var i = 0; i < tags.length; i++) {
      var slug = STAMP_MAP[tags[i].toLowerCase()];
      if (slug) return { slug: slug, label: tags[i] };
    }
    if (entry.kind === "memories" && record.entry_type === "course_played") return { slug: "course-played", label: "Course Stamp" };
    if (entry.kind === "rounds") return { slug: "round-played", label: "Round Played" };
    if (entry.kind === "achievements") return { slug: "achievement", label: "Achievement" };
    if (entry.kind === "tournaments") return { slug: "tournament", label: "Tournament" };
    return { slug: "memory", label: "Memory" };
  }

  function stampBadgeHtml(stamp) {
    if (!stamp) return "";
    return '<div class="memory-post-stamp" data-stamp="' + escapeHtml(stamp.slug) + '" title="' + escapeHtml(stamp.label) + '">' +
      '<img src="/assets/stamps/' + escapeHtml(stamp.slug) + '.svg" alt="" aria-hidden="true" onerror="this.style.display=\'none\'">' +
      '<span>' + escapeHtml(stamp.label) + '</span>' +
      '</div>';
  }

  function entryDetailChips(entry) {
    var record = entry.record;
    var chips = [];
    if (entry.kind === "rounds") {
      if (record.score) chips.push(escapeHtml("Score: " + record.score));
      if (record.holes) chips.push(escapeHtml(record.holes + " holes"));
      if (record.tees) chips.push(escapeHtml(record.tees));
    } else if (entry.kind === "achievements") {
      if (record.achievement_type) chips.push(escapeHtml(record.achievement_type));
      if (record.value) chips.push(escapeHtml(record.value));
    } else if (entry.kind === "tournaments") {
      if (record.division) chips.push(escapeHtml(record.division));
      if (record.finish) chips.push(escapeHtml("Finish: " + record.finish));
    }
    return chips;
  }

  function renderMemoryPost(entry, golfer, canEdit) {
    var record = entry.record;
    var course = entry.course || {};
    var entryPhotos = photosForEntry(entry);
    var heroPhoto = entryPhotos[0] || null;
    var extraPhotos = entryPhotos.slice(1);
    var stamp = stampForEntry(entry);
    var chips = entryDetailChips(entry);
    var tags = Array.isArray(record.tags) ? uniqueStrings(record.tags) : [];
    var golferInitial = golfer && golfer.display_name ? golfer.display_name.charAt(0).toUpperCase() : "G";
    var golferName = golfer && golfer.display_name ? escapeHtml(golfer.display_name) : "";
    var courseName = course.name || "";
    var sc = stateCode(course) || "";
    var entryDate = entry.date ? entry.date.slice(0, 10) : "";
    var metaParts = [courseName, sc, entryDate].filter(Boolean).map(escapeHtml).join(" \xb7 ");

    // Hero area
    var heroHtml;
    var addPhotoAttr = canEdit && editableKind(entry.kind)
      ? ' data-add-photo="' + escapeHtml(entry.kind + ":" + record.id) + '"' : "";
    if (heroPhoto && heroPhoto.signed_url) {
      heroHtml = '<div class="post-hero">' +
        '<img src="' + escapeHtml(heroPhoto.signed_url) + '" alt="' + escapeHtml(heroPhoto.caption || courseName) + '">' +
        (canEdit ? '<button class="post-hero-btn" type="button" data-edit-photo="' + escapeHtml(heroPhoto.id) + '">Edit Photo</button>' : '') +
        '</div>';
    } else if (course.photo_url) {
      heroHtml = '<div class="post-hero">' +
        '<img src="' + escapeHtml(course.photo_url) + '" alt="' + escapeHtml(courseName) + '">' +
        (addPhotoAttr ? '<button class="post-hero-btn post-hero-add"' + addPhotoAttr + ' type="button">+ Add Your Photo</button>' : '') +
        '</div>';
    } else {
      heroHtml = '<div class="post-hero">' +
        '<div class="post-hero-placeholder">' +
        '<span class="hero-state-code">' + escapeHtml(sc || "⛳") + '</span>' +
        '<span class="hero-course-name">' + escapeHtml(courseName) + '</span>' +
        '</div>' +
        (addPhotoAttr ? '<button class="post-hero-btn post-hero-add"' + addPhotoAttr + ' type="button">+ Add Photo</button>' : '') +
        '</div>';
    }

    var extraPhotosHtml = extraPhotos.length
      ? '<div class="post-photo-strip">' + extraPhotos.map(function (photo) {
          if (!photo.signed_url) return "";
          return '<figure>' +
            '<img src="' + escapeHtml(photo.signed_url) + '" alt="' + escapeHtml(photo.caption || "") + '">' +
            (canEdit ? '<button class="post-strip-edit" type="button" data-edit-photo="' + escapeHtml(photo.id) + '">Edit</button>' : '') +
            (photo.caption ? '<figcaption>' + escapeHtml(photo.caption) + '</figcaption>' : '') +
            '</figure>';
        }).filter(Boolean).join("") + '</div>'
      : "";

    return '<article class="memory-post">' +
      '<header class="post-header">' +
        '<div class="post-avatar">' + golferInitial + '</div>' +
        '<div class="post-meta">' +
          '<strong>' + golferName + '</strong>' +
          '<span>' + metaParts + '</span>' +
        '</div>' +
        stampBadgeHtml(stamp) +
      '</header>' +
      heroHtml +
      '<div class="post-body">' +
        '<h4>' + escapeHtml(entry.title) + '</h4>' +
        (entry.story ? '<p>' + escapeHtml(entry.story) + '</p>' : '') +
        (chips.length ? '<div class="post-facts">' + chips.map(function (c) { return '<span>' + c + '</span>'; }).join("") + '</div>' : '') +
        (tags.length ? '<div class="post-tags">' + tags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join("") + '</div>' : '') +
      '</div>' +
      extraPhotosHtml +
      (canEdit && editableKind(entry.kind)
        ? '<footer class="post-footer"><button class="post-edit-btn" type="button" data-edit-entry="' + escapeHtml(entry.kind + ":" + record.id) + '">Edit Entry</button><button class="post-delete-btn" type="button" data-delete-entry="' + escapeHtml(entry.kind + ":" + record.id) + '">Delete</button></footer>'
        : '') +
      '</article>';
  }

  function renderSelectedCoursePanel(courses, data, golfer) {
    var panel = document.getElementById("course-story-panel");
    if (!panel) return;
    if (profileState.selectedState && !profileState.selectedCourseKey) {
      var filteredCourses = courses.filter(function (item) {
        return normalizeStateCode(item.state) === profileState.selectedState;
      });
      var stateEntries = filteredCourses.reduce(function (acc, c) {
        return acc.concat(courseEntries(c, data));
      }, []);
      var canEditState = canEditCurrentGolfer();
      panel.innerHTML = [
        '<div class="selected-course-heading">',
        '<span>' + escapeHtml(profileState.selectedState) + '</span>',
        '<div>',
        '<p class="eyebrow">State selected</p>',
        '<h3>' + escapeHtml(profileState.selectedState) + ' — ' + filteredCourses.length + ' course' + (filteredCourses.length === 1 ? "" : "s") + '</h3>',
        '</div>',
        '</div>',
        stateEntries.length
          ? '<div class="course-story-list">' + stateEntries.map(function (entry) {
              return renderMemoryPost(entry, golfer, canEditState);
            }).join("") + '</div>'
          : '<p class="empty-state">No entries yet for ' + escapeHtml(profileState.selectedState) + ' courses.</p>'
      ].join("");
      return;
    }
    var course = courses.find(function (item) {
      return courseKey(item) === profileState.selectedCourseKey;
    }) || (!profileState.selectedState ? courses[0] : null);
    if (!course) {
      panel.innerHTML = "";
      return;
    }
    var entries = courseEntries(course, data);
    var canEdit = canEditCurrentGolfer();

    panel.innerHTML = [
      '<div class="selected-course-heading">',
      '<span>' + escapeHtml(stateCode(course)) + '</span>',
      '<div>',
      '<p class="eyebrow">Selected course</p>',
      '<h3>' + escapeHtml(course.name) + '</h3>',
      '<p>' + escapeHtml(coursePlace(course) || "Course location pending") + '</p>',
      '</div>',
      '</div>',
      entries.length
        ? '<div class="course-story-list">' + entries.map(function (entry) {
            return renderMemoryPost(entry, golfer, canEdit);
          }).join("") + '</div>'
        : '<p class="empty-state">No public story is attached to this course yet. ' + escapeHtml(golferFirstName(golfer)) + "'s private notes can be approved when they are ready.</p>"
    ].join("");
  }

  function renderCourseNavigation() {
    var data = profileState.publicPassport;
    if (!data) return;
    var courses = collectCourses(data);
    renderCourseCards(courses, data.golfer || {});
    renderSelectedCoursePanel(courses, data, data.golfer || {});
  }

  function selectCourseFromMapFrame() {
    var frame = document.querySelector(".profile-map-frame");
    if (!frame || !frame.contentDocument || !profileState.publicPassport) return;
    var selected = frame.contentDocument.querySelector(".course.is-selected");
    if (!selected) return;
    var name = selected.querySelector("strong") ? selected.querySelector("strong").textContent.trim() : "";
    var state = selected.querySelector(".badge") ? selected.querySelector(".badge").textContent.trim() : "";
    var courses = collectCourses(profileState.publicPassport);
    var match = courses.find(function (course) {
      return comparable(course.name) === comparable(name) &&
        (!state || normalizeStateCode(course.state) === normalizeStateCode(state));
    });
    if (!match) return;
    profileState.selectedState = normalizeStateCode(match.state);
    profileState.selectedCourseKey = courseKey(match);
    renderCourseNavigation();
  }

  function bindMapFrameBridge() {
    var frame = document.querySelector(".profile-map-frame");
    if (!frame) return;
    function attach() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.documentElement || doc.documentElement.dataset.jgpBridgeBound === "true") return;
        doc.documentElement.dataset.jgpBridgeBound = "true";
        doc.addEventListener("click", function (event) {
          if (event.target && event.target.closest && event.target.closest("[data-state]")) return;
          window.setTimeout(selectCourseFromMapFrame, 80);
        });
      } catch (error) {
        // The iframe is same-origin on this site; if that changes, postMessage remains the fallback.
      }
    }
    frame.addEventListener("load", attach);
    attach();
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
    photos = (photos || []).filter(function (photo) {
      return !isProfilePhoto(photo);
    });

    if (!photos.length) {
      grid.innerHTML = emptyCard("Approved photos and captions will collect here as the scrapbook grows.");
      return;
    }

    grid.innerHTML = photos.map(function (photo) {
      var caption = photo.caption || "Passport photo";
      var editButton = canEditCurrentGolfer()
        ? '<button class="course-entry-edit photo-edit-action" type="button" data-edit-photo="' +
          escapeHtml(photo.id) + '">Edit Photo</button>'
        : "";
      return [
        "<article>",
        photo.signed_url
          ? '<img src="' + escapeHtml(photo.signed_url) + '" alt="' + escapeHtml(caption) + '">'
          : '<div class="memory-placeholder">Photo</div>',
        "<div>",
        "<h3>" + escapeHtml(caption) + "</h3>",
        "<p>Saved to " + escapeHtml(golferFirstName(golfer)) + "'s Junior Golf Passport.</p>",
        editButton,
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
    var profilePhoto = profilePhotoFromData(profileState.publicPassport);

    if (name && golfer.display_name) name.textContent = golfer.display_name;
    if (eyebrow && golfer.display_name) eyebrow.textContent = golfer.display_name + "'s Junior Golf Passport";
    if (meta && golfer.headline) meta.textContent = golfer.headline;
    if (bio && golfer.bio) bio.textContent = golfer.bio;
    setProfilePhotoElement(photo, golfer, profilePhoto);
    setProfilePhotoElement(profileUi.photoModalImage, golfer, profilePhoto);
    if (profilePhoto && profilePhoto.signed_url) saveProfilePhotoCache(profilePhoto.signed_url);
    if (profileUi.photoButton && golfer.display_name) {
      profileUi.photoButton.setAttribute("aria-label", "View " + golfer.display_name + " profile");
    }
    if (profileUi.photoModalName) profileUi.photoModalName.textContent = golfer.display_name || "Junior golfer";
    if (profileUi.photoModalMeta) profileUi.photoModalMeta.textContent = golfer.headline || "Courses played, memories made, milestones earned.";
    if (profileUi.photoModalBio) {
      profileUi.photoModalBio.textContent = golfer.bio ||
        "This Junior Golf Passport collects courses, memories, photos, achievements, tournaments, and goals.";
    }
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
    if (profileState.me.profile.role === "admin") return Boolean(profileState.editableGolfer);
    return Boolean(currentGolferRow());
  }

  function renderEditControls() {
    var canEdit = canEditCurrentGolfer();
    var signedIn = Boolean(profileState.session && profileState.me);
    setHidden(quick.open, !canEdit);
    if (quick.signIn) {
      setHidden(quick.signIn, false);
      quick.signIn.textContent = signedIn ? "Sign Out" : "Sign In to Edit";
      quick.signIn.setAttribute("href", signedIn ? "#sign-out" : "/dashboard/");
      quick.signIn.classList.toggle("nav-signed-in", signedIn);
    }
    var editBar = document.getElementById("edit-mode-bar");
    if (editBar) setHidden(editBar, !canEdit);
    var navSignIn = document.getElementById("nav-sign-in-link");
    if (navSignIn) setHidden(navSignIn, signedIn);
    if (profileUi.photoButton) {
      profileUi.photoButton.classList.toggle("is-editable", canEdit);
      profileUi.photoButton.setAttribute("title", canEdit ? "Change profile photo" : "View golfer profile");
    }
    renderCourseNavigation();
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
      loadOwnerPassport();
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
    setHidden(quick.photoEditPanel, panel !== "photo-edit");
  }

  function openQuickAdd() {
    if (!canEditCurrentGolfer()) return;
    if (quick.date && !quick.date.value) quick.date.value = todayIso();
    if (quick.reviewTitle) quick.reviewTitle.value = "";
    if (quick.reviewCaption) quick.reviewCaption.value = "";
    profileState.courseCandidate = null;
    profileState.editingEntry = null;
    profileState.editingPhoto = null;
    profileState.baseReviewTags = [];
    profileState.reviewTags = [];
    clearReviewPhotoPreview();
    renderRibbonSuggestions([]);
    if (quick.saveReview) quick.saveReview.textContent = "Save Memory";
    setQuickStatus("");
    setHidden(quick.backdrop, false);
    showQuickPanel("compose");
    if (quick.note) quick.note.focus();
  }

  function closeQuickAdd() {
    setHidden(quick.backdrop, true);
    profileState.editingEntry = null;
    profileState.editingPhoto = null;
    profileState.addingPhotoToEntry = null;
    if (profileState.quickPhotoPreviewUrl) {
      URL.revokeObjectURL(profileState.quickPhotoPreviewUrl);
      profileState.quickPhotoPreviewUrl = "";
    }
    if (quick.photoPreview) {
      quick.photoPreview.style.backgroundImage = "";
      quick.photoPreview.classList.remove("has-image");
      setText(quick.photoPreview, "Add an optional photo");
    }
    if (quick.photo) quick.photo.value = "";
    if (quick.reviewDate) quick.reviewDate.value = "";
    clearReviewPhotoPreview();
    if (quick.photoEditFile) quick.photoEditFile.value = "";
    if (quick.saveReview) quick.saveReview.textContent = "Save Memory";
    setQuickStatus("");
    setPhotoEditStatus("");
  }

  function entryRecordTitle(kind, record, course) {
    if (!record) return course && course.name ? course.name + " memory" : "Golf memory";
    if (kind === "tournaments") return record.event_name || record.title || "Tournament result";
    return record.title || record.event_name || course && course.name || "Golf memory";
  }

  function entryRecordStory(kind, record) {
    if (!record) return "";
    return record.story || record.notes || record.value || record.finish || "";
  }

  function findPublicEntry(key) {
    var data = profileState.publicPassport;
    if (!data || !key) return null;
    var parts = key.split(":");
    var kind = parts[0];
    var id = parts.slice(1).join(":");
    var collection = data[kind] || [];
    var record = collection.find(function (item) {
      return item.id === id;
    });
    if (!record) return null;
    return { kind: kind, record: record, course: recordCourse(record) };
  }

  function findPublicPhoto(id) {
    var data = profileState.publicPassport;
    if (!data || !id) return null;
    return (data.photos || []).find(function (photo) {
      return photo.id === id;
    }) || null;
  }

  function openEntryEdit(entryKey) {
    if (!canEditCurrentGolfer()) return;
    var entry = findPublicEntry(entryKey);
    if (!entry || !editableKind(entry.kind)) return;
    var course = entry.course || {};
    profileState.editingEntry = entry;
    profileState.courseCandidate = null;
    setHidden(quick.backdrop, false);
    showQuickPanel("review");
    if (quick.reviewCourse) quick.reviewCourse.value = course.name || "";
    if (quick.reviewCity) quick.reviewCity.value = course.city || "";
    if (quick.reviewState) quick.reviewState.value = course.state || "";
    if (quick.reviewTitle) quick.reviewTitle.value = entryRecordTitle(entry.kind, entry.record, course);
    if (quick.reviewStory) quick.reviewStory.value = entryRecordStory(entry.kind, entry.record);
    var existingPhotos = photosForEntry(entry);
    var existingPhoto = existingPhotos[0] || null;
    if (quick.reviewCaption) quick.reviewCaption.value = existingPhoto && existingPhoto.caption ? existingPhoto.caption : "";
    clearReviewPhotoPreview();
    showReviewPhotoPreview(existingPhoto);
    profileState.baseReviewTags = Array.isArray(entry.record.tags) ? entry.record.tags : [];
    renderRibbonSuggestions(inferredRibbonTags({ tags: profileState.baseReviewTags }, course, entryRecordStory(entry.kind, entry.record)));
    var entryDate = entry.record.played_on || entry.record.achieved_on || "";
    if (quick.reviewDate) quick.reviewDate.value = entryDate ? entryDate.slice(0, 10) : "";
    if (quick.reviewVisibility) quick.reviewVisibility.value = entry.record.visibility || "private";
    if (quick.reviewApproved) quick.reviewApproved.checked = Boolean(entry.record.is_approved);
    if (quick.saveReview) quick.saveReview.textContent = "Update Entry";
    setQuickStatus("Editing an existing passport entry.");
  }

  async function deleteEntry(entryKey) {
    if (!canEditCurrentGolfer()) return;
    var entry = findPublicEntry(entryKey);
    if (!entry || !editableKind(entry.kind)) return;
    var label = entry.title || (entry.course && entry.course.name) || "this entry";
    if (!confirm("Delete "" + label + ""? This cannot be undone.")) return;
    try {
      await api("/entries/" + entry.kind + "/" + entry.record.id, { method: "DELETE" });
      loadPublicPassport();
    } catch (e) {
      alert("Could not delete entry: " + (e && e.message ? e.message : "unknown error"));
    }
  }

  function openPhotoEdit(photoId) {
    if (!canEditCurrentGolfer()) return;
    var photo = findPublicPhoto(photoId);
    if (!photo) return;
    profileState.editingPhoto = photo;
    setHidden(quick.backdrop, false);
    showQuickPanel("photo-edit");
    if (quick.photoEditCaption) quick.photoEditCaption.value = photo.caption || "";
    if (quick.photoEditFile) quick.photoEditFile.value = "";
    if (quick.photoEditVisibility) quick.photoEditVisibility.value = photo.visibility || "private";
    if (quick.photoEditApproved) quick.photoEditApproved.checked = Boolean(photo.is_approved);
    if (quick.photoEditHeading) quick.photoEditHeading.textContent = "Edit scrapbook photo.";
    if (quick.photoEditLabel) quick.photoEditLabel.textContent = "Replace photo";
    if (quick.photoEditHint) quick.photoEditHint.textContent = "Choose a new photo only if this one should change";
    setPhotoEditStatus("Editing a saved scrapbook photo.");
  }

  function openAddEntryPhoto(entryKey) {
    if (!canEditCurrentGolfer()) return;
    var entry = findPublicEntry(entryKey);
    if (!entry || !editableKind(entry.kind)) return;
    profileState.addingPhotoToEntry = entry;
    profileState.editingPhoto = null;
    setHidden(quick.backdrop, false);
    showQuickPanel("photo-edit");
    if (quick.photoEditCaption) quick.photoEditCaption.value = "";
    if (quick.photoEditFile) quick.photoEditFile.value = "";
    if (quick.photoEditVisibility) quick.photoEditVisibility.value = "private";
    if (quick.photoEditApproved) quick.photoEditApproved.checked = false;
    if (quick.photoEditHeading) quick.photoEditHeading.textContent = "Add a photo to this memory.";
    if (quick.photoEditLabel) quick.photoEditLabel.textContent = "Photo";
    if (quick.photoEditHint) quick.photoEditHint.textContent = "Choose a photo to attach to this entry";
    setPhotoEditStatus("Adding a photo to an existing memory.");
  }

  async function replaceEditedPhoto(photo, details) {
    var file = quick.photoEditFile && quick.photoEditFile.files ? quick.photoEditFile.files[0] : null;
    if (!file) return false;
    setPhotoEditStatus("Resizing replacement photo...");
    var uploadFile = await cappedImageFile(file);
    var path = [
      profileState.editableGolfer.id,
      Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(uploadFile.name)
    ].join("/");
    setPhotoEditStatus("Uploading replacement photo...");
    var upload = await authClient.storage
      .from("passport-photos")
      .upload(path, uploadFile, {
        cacheControl: "3600",
        contentType: uploadFile.type || "image/jpeg",
        upsert: false
      });
    if (upload.error) throw upload.error;
    await api("/photos", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        storage_path: upload.data.path,
        caption: details.caption,
        linked_type: photo.linked_type || null,
        linked_id: photo.linked_id || null,
        visibility: details.visibility,
        is_approved: details.is_approved
      }
    });
    await api("/entries/photos/" + photo.id, { method: "DELETE" });
    return true;
  }

  async function saveAddedPhoto() {
    var entry = profileState.addingPhotoToEntry;
    if (!entry) return;
    var file = quick.photoEditFile && quick.photoEditFile.files ? quick.photoEditFile.files[0] : null;
    if (!file) {
      setPhotoEditStatus("Please choose a photo to add.");
      return;
    }
    var caption = quick.photoEditCaption ? quick.photoEditCaption.value.trim() : "";
    var visibility = quick.photoEditVisibility ? quick.photoEditVisibility.value : "private";
    var isApproved = quick.photoEditApproved ? quick.photoEditApproved.checked : false;
    setPhotoEditStatus("Resizing photo...");
    var uploadFile = await cappedImageFile(file);
    var path = [
      profileState.editableGolfer.id,
      Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(uploadFile.name)
    ].join("/");
    setPhotoEditStatus("Uploading photo...");
    var upload = await authClient.storage
      .from("passport-photos")
      .upload(path, uploadFile, {
        cacheControl: "3600",
        contentType: uploadFile.type || "image/jpeg",
        upsert: false
      });
    if (upload.error) throw upload.error;
    await api("/photos", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        storage_path: upload.data.path,
        caption: caption,
        linked_type: entry.kind,
        linked_id: entry.record.id,
        visibility: visibility,
        is_approved: isApproved
      }
    });
    setPhotoEditStatus("Photo added.");
    profileState.addingPhotoToEntry = null;
    window.setTimeout(function () {
      window.location.reload();
    }, 650);
  }

  async function savePhotoEdit() {
    if (profileState.addingPhotoToEntry) {
      await saveAddedPhoto();
      return;
    }
    var photo = profileState.editingPhoto;
    if (!photo) return;
    var details = {
      caption: quick.photoEditCaption ? quick.photoEditCaption.value.trim() : "",
      visibility: quick.photoEditVisibility ? quick.photoEditVisibility.value : "private",
      is_approved: quick.photoEditApproved ? quick.photoEditApproved.checked : false
    };
    setPhotoEditStatus("Updating photo...");
    var replaced = await replaceEditedPhoto(photo, details);
    if (!replaced) {
      await api("/entries/photos/" + photo.id, {
        method: "PATCH",
        body: details
      });
    }
    setPhotoEditStatus("Updated.");
    profileState.editingPhoto = null;
    window.setTimeout(function () {
      window.location.reload();
    }, 650);
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

  function hasExistingState(state) {
    if (!profileState.publicPassport || !state) return false;
    var code = normalizeStateCode(state);
    return collectCourses(profileState.publicPassport).some(function (course) {
      return normalizeStateCode(course.state) === code;
    });
  }

  function inferredRibbonTags(draft, course, story) {
    var text = [
      quick.reviewTitle ? quick.reviewTitle.value : "",
      story,
      quick.note ? quick.note.value : "",
      draft && Array.isArray(draft.tags) ? draft.tags.join(" ") : ""
    ].join(" ").toLowerCase();
    var tags = draft && Array.isArray(draft.tags) ? draft.tags.slice() : [];

    if (/first\s+birdie|1st\s+birdie/.test(text)) tags.push("first birdie");
    if (/first\s+eagle|1st\s+eagle/.test(text)) tags.push("first eagle");
    if (/break(?:ing)?\s*100|broke\s*100/.test(text)) tags.push("broke 100");
    if (/break(?:ing)?\s*90|broke\s*90/.test(text)) tags.push("broke 90");
    if (/break(?:ing)?\s*80|broke\s*80/.test(text)) tags.push("broke 80");
    if (/personal\s+best|\bpb\b|lowest\s+round|low\s+round/.test(text)) tags.push("personal best");
    if (/tournament|\b2nd\b|second place|first place|won\b|winner|medal/.test(text)) tags.push("tournament moment");
    if (/great drive|memorable drive|strong drive/.test(text)) tags.push("memorable drive");
    if (course && course.state && !hasExistingState(course.state)) {
      tags.push("new state");
    }

    return uniqueStrings(tags);
  }

  function renderRibbonSuggestions(tags) {
    profileState.reviewTags = uniqueStrings(tags);
    if (!quick.ribbons) return;
    if (!profileState.reviewTags.length) {
      quick.ribbons.hidden = true;
      quick.ribbons.innerHTML = "";
      return;
    }
    quick.ribbons.hidden = false;
    quick.ribbons.innerHTML = [
      '<span>Ribbon suggestions</span>',
      '<div>',
      profileState.reviewTags.map(function (tag) {
        return '<strong>' + escapeHtml(tag) + '</strong>';
      }).join(""),
      '</div>'
    ].join("");
  }

  function clearReviewPhotoPreview() {
    if (profileState.reviewPhotoPreviewUrl) {
      URL.revokeObjectURL(profileState.reviewPhotoPreviewUrl);
      profileState.reviewPhotoPreviewUrl = "";
    }
    if (quick.reviewPhotoPreview) {
      quick.reviewPhotoPreview.style.backgroundImage = "";
      quick.reviewPhotoPreview.classList.remove("has-image");
      setText(quick.reviewPhotoPreview, "Add or replace the entry photo");
    }
    if (quick.reviewPhoto) quick.reviewPhoto.value = "";
  }

  function showReviewPhotoPreview(photo, fallbackText) {
    if (!quick.reviewPhotoPreview) return;
    if (profileState.reviewPhotoPreviewUrl) {
      URL.revokeObjectURL(profileState.reviewPhotoPreviewUrl);
      profileState.reviewPhotoPreviewUrl = "";
    }
    quick.reviewPhotoPreview.style.backgroundImage = "";
    quick.reviewPhotoPreview.classList.remove("has-image");
    setText(quick.reviewPhotoPreview, fallbackText || "Add or replace the entry photo");
    if (photo && photo.signed_url) {
      quick.reviewPhotoPreview.style.backgroundImage = 'url("' + String(photo.signed_url).replace(/"/g, "%22") + '")';
      quick.reviewPhotoPreview.classList.add("has-image");
      setText(quick.reviewPhotoPreview, "Current entry photo. Choose a new file to replace it.");
    }
  }

  function setReviewPhotoFilePreview(file) {
    if (!quick.reviewPhotoPreview) return;
    if (profileState.reviewPhotoPreviewUrl) {
      URL.revokeObjectURL(profileState.reviewPhotoPreviewUrl);
      profileState.reviewPhotoPreviewUrl = "";
    }
    profileState.reviewPhotoPreviewUrl = file ? URL.createObjectURL(file) : "";
    quick.reviewPhotoPreview.style.backgroundImage = profileState.reviewPhotoPreviewUrl
      ? "url(" + profileState.reviewPhotoPreviewUrl + ")"
      : "";
    quick.reviewPhotoPreview.classList.toggle("has-image", Boolean(file));
    setText(quick.reviewPhotoPreview, file ? file.name : "Add or replace the entry photo");
  }

  function currentReviewCourse() {
    return {
      name: quick.reviewCourse ? quick.reviewCourse.value : "",
      city: quick.reviewCity ? quick.reviewCity.value : "",
      state: quick.reviewState ? quick.reviewState.value : ""
    };
  }

  function refreshRibbonSuggestionsFromReview() {
    renderRibbonSuggestions(inferredRibbonTags(
      { tags: profileState.baseReviewTags },
      currentReviewCourse(),
      quick.reviewStory ? quick.reviewStory.value : ""
    ));
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
    if (quick.reviewTitle) {
      quick.reviewTitle.value = draft && draft.title
        ? draft.title
        : ((course.name || "").trim() ? (course.name || "").trim() + " memory" : story.slice(0, 70));
    }
    quick.reviewStory.value = story;
    profileState.baseReviewTags = draft && Array.isArray(draft.tags) ? draft.tags : [];
    renderRibbonSuggestions(inferredRibbonTags(draft, course, story));
    quick.reviewCaption.value = quick.reviewCaption.value || "";
    if (quick.reviewPhoto && quick.reviewPhoto.files && !quick.reviewPhoto.files.length) {
      var composeFile = quick.photo && quick.photo.files ? quick.photo.files[0] : null;
      showReviewPhotoPreview(null, composeFile ? composeFile.name : "Add or replace the entry photo");
      if (composeFile) setReviewPhotoFilePreview(composeFile);
    }
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
    if (profileState.editingEntry && profileState.editingEntry.course) {
      var existingCourse = profileState.editingEntry.course;
      var unchanged =
        comparable(existingCourse.name) === comparable(quick.reviewCourse.value) &&
        comparable(existingCourse.city) === comparable(quick.reviewCity.value) &&
        comparable(normalizeStateCode(existingCourse.state)) === comparable(normalizeStateCode(quick.reviewState.value));
      if (unchanged) return existingCourse.id || null;
    }
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
        source_place_id: candidate ? candidate.source_place_id : "",
        photo_name: candidate ? (candidate.photo_name || "") : ""
      }
    });
    return payload.course.id;
  }

  function memoryTitle() {
    if (quick.reviewTitle && quick.reviewTitle.value.trim()) return quick.reviewTitle.value.trim();
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

  function jpegFileName(value) {
    var base = safeFileName(value).replace(/\.[^.]+$/, "");
    return (base || "photo") + ".jpg";
  }

  function loadImageFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the image file."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not resize the photo."));
      }, type, quality);
    });
  }

  async function cappedImageFile(file) {
    if (!file) return null;
    if (!/^image\//.test(file.type || "")) throw new Error("Choose an image file.");

    var image = await loadImageFile(file);
    var width = image.naturalWidth || image.width;
    var height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("Could not read the image size.");

    var scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(width, height));
    if (scale >= 1) return file;

    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    var context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    var blob = await canvasToBlob(canvas, "image/jpeg", PHOTO_JPEG_QUALITY);
    return new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now()
    });
  }

  async function uploadQuickPhoto(memoryId) {
    var reviewFile = quick.reviewPhoto && quick.reviewPhoto.files ? quick.reviewPhoto.files[0] : null;
    var composeFile = quick.photo && quick.photo.files ? quick.photo.files[0] : null;
    var file = reviewFile || composeFile;
    if (!file) {
      var existingPhoto = profileState.editingEntry ? photosForEntry(profileState.editingEntry)[0] || null : null;
      if (existingPhoto) {
        await api("/entries/photos/" + existingPhoto.id, {
          method: "PATCH",
          body: {
            caption: quick.reviewCaption.value.trim(),
            visibility: quick.reviewVisibility.value,
            is_approved: quick.reviewApproved.checked
          }
        });
      }
      return;
    }
    setQuickStatus("Resizing photo...");
    var uploadFile = await cappedImageFile(file);
    var linkedType = profileState.editingEntry
      ? linkedTypeForEntryKind(profileState.editingEntry.kind)
      : "memory";
    var oldPhoto = profileState.editingEntry && reviewFile
      ? photosForEntry(profileState.editingEntry)[0] || null
      : null;
    var path = [
      profileState.editableGolfer.id,
      Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(uploadFile.name)
    ].join("/");
    setQuickStatus("Uploading photo...");
    var upload = await authClient.storage
      .from("passport-photos")
      .upload(path, uploadFile, {
        cacheControl: "3600",
        contentType: uploadFile.type || "image/jpeg",
        upsert: false
      });
    if (upload.error) throw upload.error;
    await api("/photos", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        storage_path: path,
        caption: quick.reviewCaption.value.trim(),
        linked_type: linkedType,
        linked_id: memoryId,
        visibility: quick.reviewVisibility.value,
        is_approved: quick.reviewApproved.checked
      }
    });
    if (oldPhoto) {
      await api("/entries/photos/" + oldPhoto.id, { method: "DELETE" });
    }
  }

  function openProfilePhotoModal() {
    if (!profileUi.photoModal || !profileState.publicPassport) return;
    renderGolferProfile(profileState.publicPassport.golfer || {});
    setHidden(profileUi.photoModal, false);
  }

  function closeProfilePhotoModal() {
    setHidden(profileUi.photoModal, true);
  }

  async function signOutFromProfile() {
    if (!authClient || !profileState.session) return;
    if (profileState.profilePhotoSaving) {
      setText(shareStatus, "Wait for the profile photo to finish saving before signing out.");
      return;
    }
    await authClient.auth.signOut();
    profileState.session = null;
    profileState.me = null;
    profileState.editableGolfer = null;
    renderEditControls();
  }

  async function uploadProfilePhoto() {
    if (!canEditCurrentGolfer()) {
      openProfilePhotoModal();
      return;
    }
    var file = profileUi.photoInput && profileUi.photoInput.files ? profileUi.photoInput.files[0] : null;
    if (!file) return;
    if (!authClient || !profileState.editableGolfer) throw new Error("Sign in before updating the profile photo.");
    var previewUrl = URL.createObjectURL(file);
    var golfer = (profileState.publicPassport && profileState.publicPassport.golfer) || profileState.editableGolfer || {};
    var previousPhoto = profilePhotoFromData(profileState.publicPassport);
    var previewPhoto = { signed_url: previewUrl, caption: PROFILE_PHOTO_CAPTION };
    setProfilePhotoElement(profileUi.photoButton, golfer, previewPhoto);
    setProfilePhotoElement(profileUi.photoModalImage, golfer, previewPhoto);
    setText(shareStatus, "Profile photo selected. Saving...");
    profileState.profilePhotoSaving = true;
    try {
      var uploadFile = await cappedImageFile(file);
      var path = [
        profileState.editableGolfer.id,
        "profile",
        Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + safeFileName(uploadFile.name)
      ].join("/");
      var upload = await authClient.storage
        .from("passport-photos")
        .upload(path, uploadFile, {
          cacheControl: "3600",
          contentType: uploadFile.type || "image/jpeg",
          upsert: false
        });
      if (upload.error) throw upload.error;
      await api("/photos", {
        method: "POST",
        body: {
          golfer_id: profileState.editableGolfer.id,
          storage_path: path,
          caption: PROFILE_PHOTO_CAPTION,
          visibility: "public",
          is_approved: true
        }
      });
      var refreshed = await publicApi("/golfers/" + currentPassportSlug() + "/public");
      var savedPhoto = profilePhotoFromData(refreshed);
      if (!savedPhoto || !savedPhoto.signed_url) {
        throw new Error("The upload finished, but the public passport did not return a saved profile photo yet.");
      }
      profileState.publicPassport = refreshed;
      renderGolferProfile(refreshed.golfer || golfer);
      renderPhotos(refreshed.photos || [], refreshed.golfer || golfer);
      setText(shareStatus, "Profile photo updated.");
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      setProfilePhotoElement(profileUi.photoButton, golfer, previousPhoto);
      setProfilePhotoElement(profileUi.photoModalImage, golfer, previousPhoto);
      URL.revokeObjectURL(previewUrl);
      throw new Error("Profile photo did not save: " + error.message);
    } finally {
      profileState.profilePhotoSaving = false;
      if (profileUi.photoInput) profileUi.photoInput.value = "";
    }
  }

  async function saveQuickReview() {
    setQuickStatus("Saving memory...");
    var courseId = await createCourseFromReview();
    if (profileState.editingEntry) {
      await updateQuickEntry(courseId);
      return;
    }
    var payload = await api("/memories", {
      method: "POST",
      body: {
        golfer_id: profileState.editableGolfer.id,
        course_id: courseId,
        title: memoryTitle(),
        entry_type: courseId ? "course_played" : "memory",
        story: quick.reviewStory.value.trim(),
        raw_note: quick.note.value.trim(),
        tags: profileState.reviewTags,
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

  function editedEntryPayload(courseId) {
    var entry = profileState.editingEntry;
    var record = entry.record;
    var base = {
      course_id: courseId,
      visibility: quick.reviewVisibility.value,
      is_approved: quick.reviewApproved.checked
    };
    var editedDate = quick.reviewDate && quick.reviewDate.value ? quick.reviewDate.value : null;
    if (entry.kind === "memories") {
      return Object.assign(base, {
        round_id: record.round_id || null,
        title: memoryTitle(),
        entry_type: record.entry_type || "memory",
        played_on: editedDate || record.played_on || null,
        story: quick.reviewStory.value.trim(),
        raw_note: record.raw_note || "",
        tags: uniqueStrings((Array.isArray(record.tags) ? record.tags : []).concat(profileState.reviewTags))
      });
    }
    if (entry.kind === "rounds") {
      return Object.assign(base, {
        played_on: editedDate || record.played_on || null,
        score: record.score || null,
        holes: record.holes || null,
        tees: record.tees || null,
        notes: quick.reviewStory.value.trim(),
        story: quick.reviewStory.value.trim()
      });
    }
    if (entry.kind === "achievements") {
      return Object.assign(base, {
        title: memoryTitle(),
        achievement_type: record.achievement_type || null,
        achieved_on: editedDate || record.achieved_on || null,
        round_id: record.round_id || null,
        value: record.value || null,
        story: quick.reviewStory.value.trim()
      });
    }
    if (entry.kind === "tournaments") {
      return Object.assign(base, {
        event_name: memoryTitle(),
        played_on: editedDate || record.played_on || null,
        division: record.division || null,
        score: record.score || null,
        finish: record.finish || null,
        result_url: record.result_url || null,
        story: quick.reviewStory.value.trim()
      });
    }
    return base;
  }

  async function updateQuickEntry(courseId) {
    var entry = profileState.editingEntry;
    if (!entry) return;
    if (!quick.reviewStory.value.trim()) throw new Error("Story is required.");
    setQuickStatus("Updating entry...");
    await api("/entries/" + entry.kind + "/" + entry.record.id, {
      method: "PATCH",
      body: editedEntryPayload(courseId)
    });
    await uploadQuickPhoto(entry.record.id);
    setQuickStatus("Updated.");
    profileState.editingEntry = null;
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
          if (profileState.quickPhotoPreviewUrl) {
            URL.revokeObjectURL(profileState.quickPhotoPreviewUrl);
            profileState.quickPhotoPreviewUrl = "";
          }
          profileState.quickPhotoPreviewUrl = file ? URL.createObjectURL(file) : "";
          quick.photoPreview.style.backgroundImage = profileState.quickPhotoPreviewUrl
            ? "url(" + profileState.quickPhotoPreviewUrl + ")"
            : "";
          quick.photoPreview.classList.toggle("has-image", Boolean(file));
        }
      });
    }
    if (quick.reviewPhoto) {
      quick.reviewPhoto.addEventListener("change", function () {
        var file = quick.reviewPhoto.files && quick.reviewPhoto.files[0];
        setReviewPhotoFilePreview(file || null);
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
    [quick.reviewTitle, quick.reviewStory, quick.reviewCourse, quick.reviewCity, quick.reviewState].forEach(function (field) {
      if (!field) return;
      field.addEventListener("input", refreshRibbonSuggestionsFromReview);
    });
    if (quick.saveReview) {
      quick.saveReview.addEventListener("click", function () {
        saveQuickReview().catch(function (error) {
          setQuickStatus(error.message);
        });
      });
    }
    if (quick.photoEditCancel) quick.photoEditCancel.addEventListener("click", closeQuickAdd);
    if (quick.photoEditSave) {
      quick.photoEditSave.addEventListener("click", function () {
        savePhotoEdit().catch(function (error) {
          setPhotoEditStatus(error.message);
        });
      });
    }
  }

  function bindProfilePhoto() {
    if (profileUi.photoButton) {
      profileUi.photoButton.addEventListener("click", function () {
        if (canEditCurrentGolfer() && profileUi.photoInput) {
          setText(shareStatus, "Choose a profile photo to upload.");
          profileUi.photoInput.click();
          return;
        }
        openProfilePhotoModal();
      });
    }
    if (profileUi.photoInput) {
      profileUi.photoInput.addEventListener("change", function () {
        uploadProfilePhoto().catch(function (error) {
          setText(shareStatus, error.message);
        });
      });
    }
    if (profileUi.photoModalClose) {
      profileUi.photoModalClose.addEventListener("click", closeProfilePhotoModal);
    }
    if (profileUi.photoModal) {
      profileUi.photoModal.addEventListener("click", function (event) {
        if (event.target === profileUi.photoModal) closeProfilePhotoModal();
      });
    }
    if (quick.signIn) {
      quick.signIn.addEventListener("click", function (event) {
        if (!profileState.session || quick.signIn.getAttribute("href") !== "#sign-out") return;
        event.preventDefault();
        signOutFromProfile().catch(function (error) {
          setText(shareStatus, error.message);
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
    profileState.publicPassport = normalized;
    if (!courses.some(function (course) { return courseKey(course) === profileState.selectedCourseKey; })) {
      profileState.selectedCourseKey = courses[0] ? courseKey(courses[0]) : "";
    }

    renderGolferProfile(golfer);
    renderStats(normalized);
    renderCourseCards(courses, golfer);
    renderSelectedCoursePanel(courses, normalized, golfer);
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

  async function loadOwnerPassport() {
    if (!canEditCurrentGolfer() || !profileState.editableGolfer) return;
    try {
      var allEntries = await api("/dashboard/golfers/" + profileState.editableGolfer.id + "/entries");
      profileState.ownerEntries = allEntries;
      if (profileState.publicPassport) {
        renderPublicPassport(Object.assign({}, profileState.publicPassport, allEntries));
      }
      // If publicPassport isn't loaded yet, loadPublicPassport's handler will merge on arrival
    } catch (e) {
      // fall back to whatever public data is already rendered
    }
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
      .then(function (data) {
        if (profileState.ownerEntries) {
          renderPublicPassport(Object.assign({}, data, profileState.ownerEntries));
        } else {
          renderPublicPassport(data);
        }
      })
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

  document.addEventListener("click", function (event) {
    var stateButton = event.target.closest("[data-state-filter]");
    if (stateButton) {
      profileState.selectedState = stateButton.getAttribute("data-state-filter") || "";
      profileState.selectedCourseKey = "";
      renderCourseNavigation();
      return;
    }

    var courseButton = event.target.closest("[data-course-key]");
    if (courseButton) {
      profileState.selectedCourseKey = courseButton.getAttribute("data-course-key") || "";
      renderCourseNavigation();
      var panel = document.getElementById("course-story-panel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    var editButton = event.target.closest("[data-edit-entry]");
    if (editButton) {
      openEntryEdit(editButton.getAttribute("data-edit-entry"));
      return;
    }

    var deleteButton = event.target.closest("[data-delete-entry]");
    if (deleteButton) {
      deleteEntry(deleteButton.getAttribute("data-delete-entry"));
      return;
    }

    var photoEditButton = event.target.closest("[data-edit-photo]");
    if (photoEditButton) {
      openPhotoEdit(photoEditButton.getAttribute("data-edit-photo"));
      return;
    }

    var addPhotoBtn = event.target.closest("[data-add-photo]");
    if (addPhotoBtn) {
      openAddEntryPhoto(addPhotoBtn.getAttribute("data-add-photo"));
    }
  });

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.source !== "jgp-map") return;
    if (event.data.clearState) {
      profileState.selectedState = "";
      profileState.selectedCourseKey = "";
      renderCourseNavigation();
      return;
    }
    if (event.data.state) {
      profileState.selectedState = normalizeStateCode(event.data.state);
      profileState.selectedCourseKey = "";
      renderCourseNavigation();
      return;
    }
    if (event.data.courseId) {
      profileState.selectedCourseKey = String(event.data.courseId);
      if (profileState.publicPassport) {
        var matchingCourse = collectCourses(profileState.publicPassport).find(function (course) {
          return courseKey(course) === profileState.selectedCourseKey;
        });
        if (matchingCourse) profileState.selectedState = normalizeStateCode(matchingCourse.state);
      }
    }
    renderCourseNavigation();
  });

  bindQuickAdd();
  bindProfilePhoto();
  bindMapFrameBridge();
  applyProfilePhotoCache();
  loadPublicPassport();
  loadProfileAuth();
})();
