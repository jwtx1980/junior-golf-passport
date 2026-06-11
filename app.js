(function () {
  var shareButton = document.getElementById("share-button");
  var shareStatus = document.getElementById("share-status");
  var config = window.JGP_CONFIG;

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

  loadPublicPassport();
})();
