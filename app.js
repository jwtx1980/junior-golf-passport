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
        renderStats(rounds, memories);
        renderCourseCards(rounds);
        renderMemories(memories);
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
