(function () {
    const Storage = window.GymPulseStorage;
    const BRAND_URL = "YOUR_URL_HERE";

    function getResolvedBrandUrl() {
        return BRAND_URL.startsWith("http://") || BRAND_URL.startsWith("https://") ? BRAND_URL : `https://${BRAND_URL}`;
    }

    function createId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function todayISO() {
        return new Date().toISOString().split("T")[0];
    }

    function formatDate(dateString) {
        if (!dateString) {
            return "-";
        }
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatTime(dateInput) {
        if (!dateInput) {
            return "-";
        }
        const value = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return value.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getCurrencyLocale(currency) {
        return currency === "INR" ? "en-IN" : "en-US";
    }

    function formatCurrency(amount, currency) {
        const safeAmount = Number(amount) || 0;
        if ((currency || "INR") === "INR") {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(safeAmount);
        }
        return new Intl.NumberFormat(getCurrencyLocale(currency), {
            style: "currency",
            currency,
            maximumFractionDigits: 0
        }).format(safeAmount);
    }

    function getPlanById(planId, data) {
        const source = data || Storage.getData();
        return source.plans.find((plan) => plan.id === planId) || null;
    }

    function getPlanOptions(data) {
        const source = data || Storage.getData();
        return source.plans.map((plan) => ({
            value: plan.id,
            label: plan.name,
            price: Number(plan.price || 0),
            durationDays: Number(plan.durationDays || 0),
            durationValue: Number(plan.durationValue || 0),
            durationUnit: plan.durationUnit || "days",
            description: plan.description || ""
        }));
    }

    function getPlanLabel(planId, data) {
        const plan = getPlanById(planId, data);
        return plan ? plan.name : planId || "-";
    }

    function getPlanPrice(planId, data) {
        const plan = getPlanById(planId, data);
        return plan ? Number(plan.price || 0) : 0;
    }

    function getPlanDurationLabel(plan) {
        if (!plan) {
            return "-";
        }
        const value = Number(plan.durationValue || 0);
        const unit = plan.durationUnit || "days";
        const suffix = value === 1 ? unit.slice(0, -1) : unit;
        return `${value} ${suffix}`;
    }

    function calculateExpiryDate(joinDate, planId, data) {
        const plan = getPlanById(planId, data);
        if (!joinDate || !plan) {
            return "";
        }
        const date = new Date(joinDate);
        date.setDate(date.getDate() + Number(plan.durationDays || 0));
        return date.toISOString().split("T")[0];
    }

    function daysDifference(dateString) {
        const current = new Date(todayISO());
        const target = new Date(dateString);
        const diff = target - current;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function getMemberStatus(member) {
        const daysLeft = daysDifference(member.expiryDate);
        if (daysLeft < 0) {
            return { label: "Expired", tone: "expired" };
        }
        if (daysLeft <= 7) {
            return { label: "Expiring Soon", tone: "expiring" };
        }
        return { label: "Active", tone: "active" };
    }

    function getPaymentsForMember(memberId, data) {
        return data.payments.filter((payment) => payment.memberId === memberId);
    }

    function getMemberPaid(member, data) {
        return getPaymentsForMember(member.id, data).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    }

    function getMemberBilling(member, data) {
        const totalAmount = getPlanPrice(member.plan, data);
        const paidAmount = getMemberPaid(member, data);
        return {
            plan: getPlanById(member.plan, data),
            totalAmount,
            paidAmount,
            dueAmount: Math.max(totalAmount - paidAmount, 0)
        };
    }

    function getMemberDue(member, data) {
        return getMemberBilling(member, data).dueAmount;
    }

    function getDashboardStats(data) {
        const totalMembers = data.members.length;
        const activeMembers = data.members.filter((member) => getMemberStatus(member).tone !== "expired").length;
        const expiredMembers = data.members.filter((member) => getMemberStatus(member).tone === "expired").length;
        const todayAttendance = data.attendance.filter((item) => item.date === todayISO()).length;
        const totalRevenue = data.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        return {
            totalMembers,
            activeMembers,
            expiredMembers,
            todayAttendance,
            totalRevenue
        };
    }

    function getRevenueSeries(payments, count) {
        const months = [];
        for (let index = count - 1; index >= 0; index -= 1) {
            const date = new Date();
            date.setMonth(date.getMonth() - index);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const label = date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
            const total = payments
                .filter((payment) => payment.date && payment.date.startsWith(key))
                .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            months.push({ label, total });
        }
        return months;
    }

    function getAttendanceSeries(attendance, count) {
        const days = [];
        for (let index = count - 1; index >= 0; index -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - index);
            const key = date.toISOString().split("T")[0];
            const label = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
            const total = attendance.filter((item) => item.date === key).length;
            days.push({ label, total, key });
        }
        return days;
    }

    function downloadTextFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function getQueryParam(key) {
        return new URLSearchParams(window.location.search).get(key);
    }

    function renderEmptyState(message, colspan) {
        return `<tr><td colspan="${colspan}" class="empty-state">${message}</td></tr>`;
    }

    function swalAvailable() {
        return typeof window.Swal !== "undefined";
    }

    function showToast(message, tone) {
        if (swalAvailable()) {
            window.Swal.fire({
                toast: true,
                position: "top-end",
                icon: tone === "danger" ? "error" : tone === "warning" ? "warning" : "success",
                title: message,
                showConfirmButton: false,
                timer: 2400,
                timerProgressBar: true,
                background: getCssVar("--bg-panel"),
                color: getCssVar("--text-main")
            });
            return;
        }
        window.alert(message);
    }

    function showAlert(title, text, icon) {
        if (swalAvailable()) {
            return window.Swal.fire({
                title,
                text,
                icon,
                confirmButtonColor: "#f6c453",
                background: getCssVar("--bg-panel"),
                color: getCssVar("--text-main")
            });
        }
        window.alert(`${title}: ${text}`);
        return Promise.resolve();
    }

    function confirmAction(title, text, confirmButtonText) {
        if (swalAvailable()) {
            return window.Swal.fire({
                title,
                text,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: confirmButtonText || "Confirm",
                confirmButtonColor: "#f6c453",
                cancelButtonColor: "#6c757d",
                background: getCssVar("--bg-panel"),
                color: getCssVar("--text-main")
            }).then(function (result) {
                return result.isConfirmed;
            });
        }
        return Promise.resolve(window.confirm(text));
    }

    function applyTheme(theme) {
        const safeTheme = theme === "light" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", safeTheme);
        document.documentElement.setAttribute("data-bs-theme", safeTheme);
    }

    function getCssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function fallbackHash(secret, salt) {
        const input = `${salt}:${secret}`;
        let hash = 0;
        for (let index = 0; index < input.length; index += 1) {
            hash = (hash << 5) - hash + input.charCodeAt(index);
            hash |= 0;
        }
        return `f${Math.abs(hash)}`;
    }

    function bytesToHex(buffer) {
        return Array.from(buffer)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    function generateSalt(length) {
        const size = length || 16;
        if (!window.crypto || !window.crypto.getRandomValues) {
            return createId("salt");
        }
        const bytes = new Uint8Array(size);
        window.crypto.getRandomValues(bytes);
        return bytesToHex(bytes);
    }

    async function hashSecret(secret, salt) {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            const encoded = new TextEncoder().encode(`${salt}:${secret}`);
            const digest = await window.crypto.subtle.digest("SHA-256", encoded);
            return bytesToHex(new Uint8Array(digest));
        }
        return fallbackHash(secret, salt);
    }

    async function verifySecret(secret, salt, expectedHash) {
        const computed = await hashSecret(secret, salt);
        return computed === expectedHash;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function getBrandLinkMarkup(className) {
        const safeClass = className ? ` class="${className}"` : "";
        return `<a href="${getResolvedBrandUrl()}" target="_blank" rel="noreferrer"${safeClass}>Developed by Harsh</a>`;
    }

    function formatDateTimeParts(timestamp) {
        if (!timestamp) {
            return { date: "-", time: "-" };
        }
        const date = new Date(timestamp);
        return {
            date: formatDate(date.toISOString()),
            time: formatTime(date)
        };
    }

    function buildCreatedStamp(timestamp) {
        const parts = formatDateTimeParts(timestamp);
        return `${parts.date} | ${parts.time}`;
    }

    function loadImageAsDataUrl(src) {
        return new Promise(function (resolve, reject) {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext("2d");
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            image.onerror = function () {
                reject(new Error(`Failed to load image ${src}`));
            };
            image.src = src;
        });
    }

    window.GymPulseUtils = {
        BRAND_URL,
        getResolvedBrandUrl,
        createId,
        todayISO,
        formatDate,
        formatTime,
        formatDateTimeParts,
        buildCreatedStamp,
        formatCurrency,
        getPlanById,
        getPlanOptions,
        getPlanLabel,
        getPlanPrice,
        getPlanDurationLabel,
        calculateExpiryDate,
        getMemberStatus,
        getMemberPaid,
        getMemberBilling,
        getMemberDue,
        getDashboardStats,
        getRevenueSeries,
        getAttendanceSeries,
        downloadTextFile,
        getQueryParam,
        renderEmptyState,
        showToast,
        showAlert,
        confirmAction,
        applyTheme,
        getCssVar,
        generateSalt,
        hashSecret,
        verifySecret,
        escapeHtml,
        getBrandLinkMarkup,
        loadImageAsDataUrl
    };
})();
