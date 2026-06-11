(function () {
  if (window.supabase) return;
  if (typeof supabase !== "undefined") {
    window.supabase = supabase;
  }
})();
