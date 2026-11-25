(function () {
    const API = "http://localhost:3000/api/posts";

    // "22:37" → 글이 작성된 날짜의 해당 시각(ISO)
    function timeToIso(timeStr, createdAt) {
        if (!timeStr) return null;
        const parts = String(timeStr).split(":");
        const base = createdAt ? new Date(createdAt) : new Date();
        base.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        return base.toISOString();
    }

    window.Team22Adapter = {
        getCurrentUser: function () {
            return window.Auth ? window.Auth.getCurrentUser() : null;
        },

        getPostById: async function (id) {
            const response = await fetch(API + "/" + encodeURIComponent(id));
            if (response.status === 404) return null;
            if (!response.ok) throw new Error("HTTP " + response.status);

            const p = await response.json();
            return {
                id: p.id,
                title: p.title,
                category: p.category,
                organizer: p.organizer || {},
                maxParticipants: p.maxParticipants,
                pickupPlace: p.location,
                orderAt: timeToIso(p.orderTime, p.createdAt),
                deadline: timeToIso(p.deadlineTime, p.createdAt),
                settlementMethod: p.settlementType === "individual" ? "개인 메뉴별 정산" : "1/N",
                joinMethod: p.approvalType === "instant" ? "instant" : "approval",
                status: p.status === "모집 중" ? "open" : "closed"
            };
        }
    };
})();