
document.addEventListener("DOMContentLoaded", function () {
    const deliveryPage = document.querySelector("#delivery-page");
    const groupPage = document.querySelector("#group-page");

    const deliveryButton = document.querySelector(".div-2 .view");
    const groupButton = document.querySelector(".div-2 .do-something-wrapper");

    const headerLine = document.querySelector(".header-2");
    const logo = document.querySelector(".text-wrapper-7");
    const headerLinks = document.querySelectorAll(".header .text-wrapper-8");
    const accountButton = document.querySelector(".style-filled");
    const accountText = document.querySelector(".do-something-7");

    function showPage(type) {
        const isDelivery = type === "delivery";
        const color = isDelivery ? "#ffb238" : "#52b788";

        deliveryPage.style.display = isDelivery ? "block" : "none";
        groupPage.style.display = isDelivery ? "none" : "block";

        deliveryButton.style.backgroundColor = isDelivery ? color : "transparent";
        deliveryButton.style.borderColor = color;
        deliveryButton.querySelector(".do-something").style.color =
            isDelivery ? "#ffffff" : color;

        groupButton.style.backgroundColor = isDelivery ? "transparent" : color;
        groupButton.style.borderColor = color;
        groupButton.querySelector(".do-something-2").style.color =
            isDelivery ? color : "#ffffff";

        headerLine.style.borderBottomColor = color;
        logo.style.color = color;

        headerLinks.forEach(function (link) {
            link.style.color = color;
        });

        accountButton.style.backgroundColor = color;
        accountButton.style.borderColor = color;
        accountText.style.color = "#ffffff";

        document.querySelectorAll(".dropdown-button .rectangle").forEach(function (item) {
            item.style.borderColor = color;
        });

        document.querySelectorAll(".dropdown-button .text-wrapper-2, .dropdown-button .text-wrapper-6").forEach(function (item) {
            item.style.color = color;
        });

        document.querySelectorAll(".dropdown-button .dropdown-menu").forEach(function (item) {
            item.style.borderColor = color;
        });

        document.querySelectorAll(".dropdown-option").forEach(function (item) {
            item.style.color = color;
        });
    }

    deliveryButton.addEventListener("click", function () {
        showPage("delivery");
    });

    groupButton.addEventListener("click", function () {
        showPage("group");
    });

    function activateCategories(container, color) {
        const buttons = container.querySelectorAll(":scope > div");

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                buttons.forEach(function (item) {
                    item.style.backgroundColor = "transparent";
                    const label = item.querySelector("div");
                    if (label) label.style.color = color;
                });

                button.style.backgroundColor = color;
                const label = button.querySelector("div");
                if (label) label.style.color = "#ffffff";
            });
        });
    }

    activateCategories(
        document.querySelector(".delivery-categories"),
        "#ffb238"
    );

    activateCategories(
        document.querySelector("#group-page .group"),
        "#52b788"
    );

    document.querySelectorAll(".dropdown-button").forEach(function (dropdown) {
        const label = dropdown.querySelector(".text-wrapper-2, .text-wrapper-6");

        dropdown.addEventListener("click", function (event) {
            const option = event.target.closest(".dropdown-option");

            if (option) {
                label.textContent = option.textContent;
                dropdown.classList.remove("open");
            } else {
                dropdown.classList.toggle("open");
            }
        });
    });

    showPage("delivery");
});
