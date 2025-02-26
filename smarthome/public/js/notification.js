document.addEventListener("DOMContentLoaded", function () {
    const notification = document.getElementById("notification");
    if (notification.innerText.trim() !== "") {
        notification.classList.remove("hidden");
        setTimeout(() => {
            notification.classList.add("hidden");
        }, 3000);
    }
});