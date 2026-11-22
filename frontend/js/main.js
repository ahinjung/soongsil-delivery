document.addEventListener("DOMContentLoaded", async function () {
    const deliveryPage = document.querySelector("#delivery-page");
    const groupPage = document.querySelector("#group-page");

    const deliveryButton = document.querySelector(".div-2 .view");
    const groupButton = document.querySelector(".div-2 .do-something-wrapper");

    const headerLine = document.querySelector(".header-2");
    const logo = document.querySelector(".text-wrapper-7");
    const headerLinks = document.querySelectorAll(".header .text-wrapper-8");
    const accountButton = document.querySelector(".style-filled");
    const accountText = document.querySelector(".do-something-7");
    // 로그인 상태 확인
    const currentUser = await Auth.getCurrentUser();

if (currentUser) {
    accountText.textContent = "마이페이지";
} else {
    accountText.textContent = "로그인";
}

accountButton.addEventListener("click", function (event) {
    event.preventDefault();

    if (currentUser) {
        window.location.href = "mypage.html";
    } else {
        window.location.href = "login.html";
    }
});
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

    const listEl = document.createElement("div");
    listEl.id = "postList";
    deliveryPage.appendChild(listEl);

    const groupListEl = document.createElement("div");
    groupListEl.id = "groupList";
    groupListEl.classList.add("is-empty");

    const groupEmpty = document.createElement("div");
    groupEmpty.className = "empty-posts";

    const groupEmptyTitle = document.createElement("p");
    groupEmptyTitle.textContent = "아직 등록된 게시물이 없습니다.";
    const groupEmptyDesc = document.createElement("span");
    groupEmptyDesc.textContent = "새로운 게시물이 등록되면 여기에 표시됩니다.";

    groupEmpty.append(groupEmptyTitle, groupEmptyDesc);
    groupListEl.appendChild(groupEmpty);
    groupPage.appendChild(groupListEl);

    function formatWon(n) {
        return n === null || n === undefined ? null : Number(n).toLocaleString("ko-KR") + "원";
    }

    function formatAmount(min, max) {
        const a = formatWon(min);
        const b = formatWon(max);
        if (a && b) return a + " ~ " + b;
        if (a) return a + " 이상";
        if (b) return b + " 이하";
        return "금액 제한 없음";
    }

    function formatTime(t) {
        if (!t) return "-";
        const parts = t.split(":");
        const h = Number(parts[0]);
        const m = parts[1];
        const period = h < 12 ? "오전" : "오후";
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return period + " " + hour12 + ":" + m;
    }

    function makeInfo(label, value) {
        const row = document.createElement("div");
        row.className = "post-info";

        const k = document.createElement("span");
        k.className = "post-info-label";
        k.textContent = label;

        const v = document.createElement("span");
        v.className = "post-info-value";
        v.textContent = value;

        row.append(k, v);
        return row;
    }

    function renderPost(post) {
        const card = document.createElement("div");
        card.className = "post-card";

        const top = document.createElement("div");
        top.className = "post-top";

        const category = document.createElement("span");
        category.className = "post-category";
        category.textContent = post.category;

        const status = document.createElement("span");
        status.className = "post-status" + (post.status === "모집 중" ? "" : " closed");
        status.textContent = post.status;

        top.append(category, status);

        const title = document.createElement("h3");
        title.className = "post-title";
        title.textContent = post.title;

        const body = document.createElement("div");
        body.className = "post-body";
        body.append(
            makeInfo("장소", post.location),
            makeInfo("모집 마감", formatTime(post.deadlineTime)),
            makeInfo("주문 시간", formatTime(post.orderTime)),
            makeInfo("예상 금액", formatAmount(post.minAmount, post.maxAmount))
        );

        const footer = document.createElement("div");
        footer.className = "post-footer";
        footer.textContent = "👥 최대 " + post.maxParticipants + "명";

        card.append(top, title, body, footer);

        // 모집글 상세 페이지 이동
        card.style.cursor = "pointer";

        card.addEventListener("click", function () {
            window.location.href =
                "post_detail.html?id=" + encodeURIComponent(post.id);
});

return card;}

    async function loadPosts() {
        try {
            const response = await fetch("http://localhost:3000/api/posts");
            if (!response.ok) throw new Error("HTTP " + response.status);
            const posts = await response.json();

            listEl.textContent = "";
            listEl.classList.toggle("is-empty", posts.length === 0);

            if (posts.length === 0) {
                const empty = document.createElement("div");
                empty.className = "empty-posts";

                const p = document.createElement("p");
                p.textContent = "아직 등록된 게시물이 없습니다.";
                const span = document.createElement("span");
                span.textContent = "새로운 게시물이 등록되면 여기에 표시됩니다.";

                empty.append(p, span);
                listEl.appendChild(empty);
                return;
            }

            posts.slice().reverse().forEach(function (post) {
                listEl.appendChild(renderPost(post));
            });
        } catch (error) {
            console.error("목록 불러오기 오류:", error);
            listEl.classList.add("is-empty");
            listEl.textContent = "모집글을 불러올 수 없어요. 백엔드 서버가 실행 중인지 확인해 주세요.";
        }
    }

    showPage("delivery");
    loadPosts();
});