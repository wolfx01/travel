document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector("#button");
    const loginMenu = document.querySelector("#login");

    if (hamburger && navMenu && loginMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
            loginMenu.classList.toggle("active");
        });

        document.querySelectorAll(".a").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
            loginMenu.classList.remove("active");
        }));
    }
});
