export function showView(name) {
  const views = ["hub", "folder", "workspace"];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? "flex" : "none";
  });

  const topBar = document.getElementById("top-bar");
  if (topBar) topBar.style.display = name === "workspace" ? "flex" : "none";
}
