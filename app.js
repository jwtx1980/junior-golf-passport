(function () {
  var form = document.getElementById("memory-form");
  var list = document.getElementById("dashboard-list");
  var shareButton = document.getElementById("share-button");
  var shareStatus = document.getElementById("share-status");

  function formatDate(value) {
    if (!value) {
      return "No date";
    }

    var date = new Date(value + "T12:00:00");
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  if (form && list) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = new FormData(form);
      var type = String(data.get("type") || "Memory").trim();
      var title = String(data.get("title") || "Untitled memory").trim();
      var details = String(data.get("details") || "").trim();
      var date = formatDate(String(data.get("date") || ""));
      var visibility = String(data.get("visibility") || "Public").trim();

      var item = document.createElement("article");
      item.innerHTML = "<strong></strong><span></span><p></p>";
      item.querySelector("strong").textContent = title;
      item.querySelector("span").textContent = type + " - " + date + " - " + visibility;
      item.querySelector("p").textContent = details || "No details added yet.";
      list.prepend(item);
    });
  }

  if (shareButton) {
    shareButton.addEventListener("click", function () {
      var url = window.location.href;

      if (navigator.share) {
        navigator.share({
          title: "Kara Walker | Junior Golf Passport",
          text: "View Kara's Junior Golf Passport.",
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
})();
