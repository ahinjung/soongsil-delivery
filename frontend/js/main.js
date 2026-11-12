
document.addEventListener("DOMContentLoaded", function () {

    const posts = [
        ...document.querySelectorAll(
            ".auto-layout-vertical-2 > div, .auto-layout-vertical-6 > div"
        )
    ].filter(post => post.querySelector(".text-wrapper-2"));

    const deliveryButton = document.querySelector(".view");
    const groupButton = document.querySelector(".do-something-wrapper");

    const categoryButtons = [
        document.querySelector(".view-2"),
        document.querySelector(".view-3"),
        document.querySelector(".div-3"),
        document.querySelector(".view-4"),
        document.querySelector(".view-5"),
        document.querySelector(".view-6"),
        document.querySelector(".view-7"),
        document.querySelector(".view-8")
    ];

    const categories = [
        "전체",
        "한식",
        "치킨",
        "일식",
        "양식",
        "분식",
        "카페",
        "중식"
    ];

    let selectedCategory = "전체";
    let selectedType = "배달";

    function filterPosts() {
        posts.forEach(post => {
            const title = post.querySelector(".text-wrapper-2").textContent;

            const categoryMatch =
                selectedCategory === "전체" ||
                title.includes(selectedCategory);

            const typeMatch = selectedType === "배달";

            post.style.display =
                categoryMatch && typeMatch ? "" : "none";
        });
    }

    if (deliveryButton) {
        deliveryButton.style.cursor = "pointer";

        deliveryButton.addEventListener("click", function () {
            selectedType = "배달";
            filterPosts();
        });
    }

    if (groupButton) {
        groupButton.style.cursor = "pointer";

        groupButton.addEventListener("click", function () {
            selectedType = "공동구매";
            filterPosts();
        });
    }

    categoryButtons.forEach((button, index) => {
        if (!button) return;

        button.style.cursor = "pointer";

        button.addEventListener("click", function () {
            selectedCategory = categories[index];
            selectedType = "배달";

            categoryButtons.forEach(item => {
                if (item) item.classList.remove("active");
            });

            button.classList.add("active");

            filterPosts();
        });
    });

    const initialCategoryButton = categoryButtons[0];

    const sortOptions = ["마감 임박 순", "빠른 주문 순", "최신 순"];
    let currentSortIndex = 0;

    if (initialCategoryButton) {
        initialCategoryButton.classList.add("active");
    }

    filterPosts();

    const sortButton = document.querySelector(".dropdown-button");
    const sortText = document.querySelector(".text-wrapper-6");
    const dropdownOptions = document.querySelectorAll(".dropdown-option");

    if (sortButton) {
        sortButton.addEventListener("click", function (event) {
            event.stopPropagation();
            sortButton.classList.toggle("open");
        });
    }

    dropdownOptions.forEach(option => {
        option.addEventListener("click", function (event) {
            event.stopPropagation();

            const selectedSort = option.textContent.trim();

            sortText.textContent = selectedSort;
            sortButton.classList.remove("open");

            sortPosts(selectedSort);
        });
    });

    document.addEventListener("click", function () {
        sortButton?.classList.remove("open");
    });

    function sortPosts(sortType) {
        const postContainer = document.querySelector(".auto-layout-vertical-2");

        if (!postContainer) return;

        const sortedPosts = [...posts];

        sortedPosts.sort((a, b) => {
            if (sortType === "마감 임박 순") {
                return getTime(a, "모집 마감 시간") -
                    getTime(b, "모집 마감 시간");
            }

            if (sortType === "빠른 주문 순") {
                return getTime(a, "주문 예정 시간") -
                    getTime(b, "주문 예정 시간");
            }

            if (sortType === "최신 순") {
                return new Date(b.dataset.createdAt || 0) -
                    new Date(a.dataset.createdAt || 0);
            }
        });

        sortedPosts.forEach(post => postContainer.appendChild(post));

        filterPosts();
    }

    function getTime(post, label) {
        const text = post.querySelector(".element")?.textContent || "";
        const match = text.match(
            new RegExp(label + ":\\s*오후?\\s*(\\d{1,2})시\\s*(\\d{1,2})분")
        );

        if (!match) return Infinity;

        return Number(match[1]) * 60 + Number(match[2]);
    }
});
