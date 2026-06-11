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

  function renderCourseCards(rounds) {
    var grid = document.querySelector(".course-card-grid");
    if (!grid || !rounds.length) return;

    var courses = uniqueBy(rounds.map(function (round) {
      return round.courses;
    }).filter(Boolean), function (course) {
      return course.id || course.name;
    });

    if (!courses.length) return;

    grid.innerHTML = courses.map(function (course) {
      var stateCode = String(course.state || "").slice(0, 2).toUpperCase();
      return [
        "<article>",
        "<span>" + escapeHtml(stateCode) + "</span>",
        "<h3>" + escapeHtml(course.name) + "</h3>",
        "<p>" + escapeHtml(coursePlace(course)) + "</p>",
        '<p class="course-verification">' + escapeHtml(courseVerificationLabel(course)) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderMemories(memories) {
    var timeline = document.querySelector(".timeline");
    if (!timeline || !memories.length) return;

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

  function renderAchievements(achievements) {
    var grid = document.querySelector(".achievement-grid");
    if (!grid || !achievements.length) return;

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

  function renderTournaments(tournaments) {
    var list = document.querySelector(".tournament-list");
    if (!list || !tournaments.length) return;

    list.innerHTML = tournaments.map(function (tournament) {
      var details = [tournament.division, tournament.score, tournament.story].filter(Boolean).join(" - ");
      return [
        "<article>",
        "<div>",
        "<h3>" + escapeHtml(tournament.event_name) + "</h3>",
        "<p>" + escapeHtml(details || "Tournament result saved to Kara's passport.") + "</p>",
        "</div>",
        '<div class="result">' + escapeHtml(tournament.finish || "Saved") + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderPhotos(photos) {
    var grid = document.querySelector("#photos .memory-grid");
    if (!grid || !photos.length) return;

    grid.innerHTML = photos.map(function (photo) {
      var caption = photo.caption || "Passport photo";
      return [
        "<article>",
        photo.signed_url
          ? '<img src="' + escapeHtml(photo.signed_url) + '" alt="' + escapeHtml(caption) + '">'
          : '<div class="memory-placeholder">Photo</div>',
        "<div>",
        "<h3>" + escapeHtml(caption) + "</h3>",
        "<p>Saved to Kara's Junior Golf Passport.</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderStats(rounds, memories) {
    var stats = document.querySelector(".profile-stats");
    if (!stats || !rounds.length) return;

    var courses = uniqueBy(rounds.map(function (round) {
      return round.courses;
    }).filter(Boolean), function (course) {
      return course.id || course.name;
    });
    var states = uniqueBy(courses, function (course) {
      return course.state;
    });

    stats.innerHTML = [
      "<div><strong>" + courses.length + "</strong><span>Courses played</span></div>",
      "<div><strong>" + states.length + "</strong><span>States stamped</span></div>",
      "<div><strong>" + courses.length + "</strong><span>Verified pins</span></div>",
      "<div><strong>" + Math.max(memories.length, 1) + "</strong><span>Saved memories</span></div>"
    ].join("");
  }

  function loadKaraPassport() {
    if (!config || !document.body.classList.contains("profile-page")) return;

    fetch(config.passportApiBaseUrl + "/golfers/kara/public")
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load live passport.");
        return response.json();
      })
      .then(function (data) {
        var rounds = Array.isArray(data.rounds) ? data.rounds : [];
        var memories = Array.isArray(data.memories) ? data.memories : [];
        var achievements = Array.isArray(data.achievements) ? data.achievements : [];
        var tournaments = Array.isArray(data.tournaments) ? data.tournaments : [];
        var photos = Array.isArray(data.photos) ? data.photos : [];
        renderStats(rounds, memories);
        renderCourseCards(rounds);
        renderMemories(memories);
        renderAchievements(achievements);
        renderTournaments(tournaments);
        renderPhotos(photos);
      })
      .catch(function () {
        // Keep the static passport visible if the live API is unavailable.
      });
  }

  if (shareButton) {
    shareButton.addEventListener("click", function () {
      var url = window.location.href;

      if (navigator.share) {
        navigator.share({
          title: "Kara Walker's Junior Golf Passport",
          text: "View Kara Walker's Junior Golf Passport.",
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

  loadKaraPassport();
})();
