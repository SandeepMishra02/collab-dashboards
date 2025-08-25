export type Role = "owner" | "editor" | "viewer" | "public";

export function getIdentity() {
  // SUPER simple: read from localStorage. Set once in the UI header if you want.
  if (typeof window === "undefined") return { user: null, role: "public" as Role };
  const user = localStorage.getItem("x_user");
  const role = (localStorage.getItem("x_role") as Role) || (user ? "viewer" : "public");
  return { user, role };
}

export function setIdentity(user: string | null, role: Role) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem("x_user", user); else localStorage.removeItem("x_user");
  localStorage.setItem("x_role", role);
}
