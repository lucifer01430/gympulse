(function () {
    const DB_KEY = "gympulse_db";
    const SESSION_KEY = "gympulse_session";

    const defaultSettings = {
        gymName: "ARMOUR FITNESS CLUB",
        currency: "INR",
        theme: "dark",
        adminUsername: "",
        adminPasswordHash: "",
        adminSalt: "",
        pin: "",
        pinHash: "",
        pinSalt: ""
    };

    const defaultPlans = [
        {
            id: "monthly",
            name: "Monthly",
            durationValue: 30,
            durationUnit: "days",
            durationDays: 30,
            price: 1500,
            description: "Standard gym access with monthly renewal."
        },
        {
            id: "quarterly",
            name: "Quarterly",
            durationValue: 3,
            durationUnit: "months",
            durationDays: 90,
            price: 4000,
            description: "Quarterly access with better value for regular members."
        },
        {
            id: "annual",
            name: "Annual",
            durationValue: 12,
            durationUnit: "months",
            durationDays: 365,
            price: 14000,
            description: "Annual commitment with the best membership savings."
        },
        {
            id: "personal",
            name: "Personal Training",
            durationValue: 30,
            durationUnit: "days",
            durationDays: 30,
            price: 3500,
            description: "Focused plan with personal training support."
        }
    ];

    const legacyDemoIds = {
        members: ["member-001", "member-002", "member-003", "member-004"],
        attendance: ["att-001", "att-002", "att-003", "att-004", "att-005"],
        payments: ["pay-001", "pay-002", "pay-003", "pay-004"],
        invoices: ["inv-001"]
    };

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function durationToDays(value, unit) {
        const safeValue = Number(value) || 0;
        return unit === "months" ? safeValue * 30 : safeValue;
    }

    function normalizePlan(plan) {
        const safePlan = plan && typeof plan === "object" ? plan : {};
        const durationValue = Number(safePlan.durationValue || safePlan.durationDays || 30);
        const durationUnit = safePlan.durationUnit || "days";
        return {
            id: safePlan.id || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: safePlan.name || safePlan.label || "Untitled Plan",
            durationValue,
            durationUnit,
            durationDays: Number(safePlan.durationDays) || durationToDays(durationValue, durationUnit),
            price: Number(safePlan.price || 0),
            description: safePlan.description || ""
        };
    }

    function normalizeMember(member) {
        const safeMember = member && typeof member === "object" ? member : {};
        return {
            id: safeMember.id || `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: safeMember.name || "Unnamed Member",
            phone: safeMember.phone || "",
            plan: safeMember.plan || "monthly",
            joinDate: safeMember.joinDate || "",
            expiryDate: safeMember.expiryDate || "",
            notes: safeMember.notes || ""
        };
    }

    function getInitialData() {
        return {
            members: [],
            attendance: [],
            payments: [],
            invoices: [],
            regeneratedInvoices: [],
            plans: deepClone(defaultPlans),
            settings: deepClone(defaultSettings)
        };
    }

    function getDefaultPlans() {
        return deepClone(defaultPlans);
    }

    function sanitizeCollection(collection, legacyIds) {
        return collection.filter((item) => !legacyIds.includes(item.id));
    }

    function normalizeRegeneratedInvoice(invoice, sourceInvoices, safeSettings) {
        const safeInvoice = invoice && typeof invoice === "object" ? invoice : {};
        const createdAt = safeInvoice.createdAt || safeInvoice.regeneratedAt || new Date().toISOString();
        return {
            ...safeInvoice,
            id: safeInvoice.id || `regen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            originalInvoiceId: safeInvoice.originalInvoiceId || "",
            totalAmount: Number(safeInvoice.totalAmount || safeInvoice.amount || 0),
            paidAmount: Number(safeInvoice.paidAmount || 0),
            dueAmount: Number(safeInvoice.dueAmount || 0),
            amount: Number(safeInvoice.amount || safeInvoice.totalAmount || 0),
            memberPhone: safeInvoice.memberPhone || "",
            currency: safeInvoice.currency || safeSettings.currency,
            isRegenerated: true,
            createdAt,
            regeneratedAt: safeInvoice.regeneratedAt || createdAt,
            sourceInvoiceNumber:
                safeInvoice.sourceInvoiceNumber ||
                (sourceInvoices.find((entry) => entry.id === safeInvoice.originalInvoiceId) || {}).invoiceNumber ||
                ""
        };
    }

    function normalizeData(data) {
        const safeData = data && typeof data === "object" ? data : {};
        const safeSettings = {
            ...defaultSettings,
            ...(safeData.settings || {})
        };

        const rawPlans = Array.isArray(safeData.plans) && safeData.plans.length ? safeData.plans : getDefaultPlans();
        const plans = rawPlans.map(normalizePlan);
        const members = Array.isArray(safeData.members) ? safeData.members.map(normalizeMember) : [];
        const attendance = Array.isArray(safeData.attendance) ? safeData.attendance : [];
        const paymentsSource = Array.isArray(safeData.payments) ? safeData.payments : [];
        const invoicesSource = Array.isArray(safeData.invoices) ? safeData.invoices : [];
        const regeneratedInvoicesSource = Array.isArray(safeData.regeneratedInvoices) ? safeData.regeneratedInvoices : [];
        const planLookup = new Map(plans.map((plan) => [plan.id, plan]));
        const memberLookup = new Map(members.map((member) => [member.id, member]));
        const memberPaidTotals = {};

        const payments = paymentsSource.map((payment) => {
            const safePayment = payment && typeof payment === "object" ? payment : {};
            const member = memberLookup.get(safePayment.memberId);
            const plan = member ? planLookup.get(member.plan) : null;
            const amount = Number(safePayment.amount || 0);
            const previousPaid =
                typeof safePayment.previousPaid === "number"
                    ? safePayment.previousPaid
                    : Number(memberPaidTotals[safePayment.memberId] || 0);
            const totalAmount = Number(safePayment.totalAmount || (plan ? plan.price : 0));
            const totalPaid = typeof safePayment.totalPaid === "number" ? safePayment.totalPaid : previousPaid + amount;
            const dueAmount =
                typeof safePayment.dueAmount === "number" ? safePayment.dueAmount : Math.max(totalAmount - totalPaid, 0);

            memberPaidTotals[safePayment.memberId] = totalPaid;

            return {
                ...safePayment,
                totalAmount,
                previousPaid,
                totalPaid,
                dueAmount,
                planId: safePayment.planId || (member ? member.plan : ""),
                planName: safePayment.planName || (plan ? plan.name : "")
            };
        });

        const invoices = invoicesSource.map((invoice) => {
            const safeInvoice = invoice && typeof invoice === "object" ? invoice : {};
            const member = memberLookup.get(safeInvoice.memberId);
            const planId = safeInvoice.plan || safeInvoice.planId || (member ? member.plan : "");
            const plan = planLookup.get(planId);
            const totalAmount = Number(safeInvoice.totalAmount || safeInvoice.amount || (plan ? plan.price : 0));
            const paidAmount =
                typeof safeInvoice.paidAmount === "number"
                    ? safeInvoice.paidAmount
                    : Math.max(totalAmount - Number(safeInvoice.dueAmount || 0), 0);
            const dueAmount =
                typeof safeInvoice.dueAmount === "number" ? safeInvoice.dueAmount : Math.max(totalAmount - paidAmount, 0);
            const createdAt = safeInvoice.createdAt || new Date().toISOString();

            return {
                ...safeInvoice,
                plan: planId,
                planName: safeInvoice.planName || (plan ? plan.name : ""),
                totalAmount,
                paidAmount,
                dueAmount,
                amount: Number(safeInvoice.amount || totalAmount),
                memberPhone: safeInvoice.memberPhone || (member ? member.phone : ""),
                currency: safeInvoice.currency || safeSettings.currency,
                createdAt,
                isRegenerated: Boolean(safeInvoice.isRegenerated)
            };
        });

        const regeneratedInvoices = regeneratedInvoicesSource.map((invoice) =>
            normalizeRegeneratedInvoice(invoice, invoices, safeSettings)
        );

        return {
            members: sanitizeCollection(members, legacyDemoIds.members),
            attendance: sanitizeCollection(attendance, legacyDemoIds.attendance),
            payments: sanitizeCollection(payments, legacyDemoIds.payments),
            invoices: sanitizeCollection(invoices, legacyDemoIds.invoices),
            regeneratedInvoices,
            plans,
            settings: safeSettings
        };
    }

    function getData() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (!raw) {
                const initial = getInitialData();
                saveData(initial);
                return initial;
            }
            const parsed = normalizeData(JSON.parse(raw));
            saveData(parsed);
            return parsed;
        } catch (error) {
            const initial = getInitialData();
            saveData(initial);
            return initial;
        }
    }

    function saveData(data) {
        const normalized = normalizeData(data);
        localStorage.setItem(DB_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function addItem(collection, item) {
        const data = getData();
        if (!Array.isArray(data[collection])) {
            return null;
        }
        data[collection].push(item);
        saveData(data);
        return item;
    }

    function updateItem(collection, id, updatedFields) {
        const data = getData();
        if (!Array.isArray(data[collection])) {
            return null;
        }
        const index = data[collection].findIndex((item) => item.id === id);
        if (index === -1) {
            return null;
        }
        data[collection][index] = {
            ...data[collection][index],
            ...updatedFields
        };
        saveData(data);
        return data[collection][index];
    }

    function deleteItem(collection, id) {
        const data = getData();
        if (!Array.isArray(data[collection])) {
            return false;
        }
        data[collection] = data[collection].filter((item) => item.id !== id);
        saveData(data);
        return true;
    }

    function updateSettings(updatedSettings) {
        const data = getData();
        data.settings = {
            ...data.settings,
            ...updatedSettings
        };
        saveData(data);
        return data.settings;
    }

    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : { loggedIn: false };
        } catch (error) {
            return { loggedIn: false };
        }
    }

    function setSession(session) {
        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                loggedIn: Boolean(session && session.loggedIn),
                username: session && session.username ? session.username : ""
            })
        );
    }

    function setLoggedIn(loggedIn) {
        setSession({ loggedIn });
    }

    function clearSession() {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: false, username: "" }));
    }

    function isLoggedIn() {
        return Boolean(getSession().loggedIn);
    }

    function hasAdminSetup() {
        const data = getData();
        return Boolean(data.settings.adminUsername && data.settings.adminPasswordHash);
    }

    function resetData(nextData) {
        const data = nextData ? normalizeData(nextData) : getInitialData();
        saveData(data);
        return data;
    }

    function init() {
        saveData(getData());
        if (!localStorage.getItem(SESSION_KEY)) {
            clearSession();
        }
    }

    window.GymPulseStorage = {
        DB_KEY,
        init,
        getData,
        saveData,
        addItem,
        updateItem,
        deleteItem,
        updateSettings,
        getSession,
        setSession,
        setLoggedIn,
        clearSession,
        isLoggedIn,
        hasAdminSetup,
        resetData,
        getInitialData,
        getDefaultPlans
    };
})();
