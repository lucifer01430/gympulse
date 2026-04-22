(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;
    const charts = {};

    const navItems = [
        { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: "D" },
        { key: "members", label: "Members", href: "members.html", icon: "M" },
        { key: "plans", label: "Plans", href: "plans.html", icon: "PL" },
        { key: "attendance", label: "Attendance", href: "attendance.html", icon: "A" },
        { key: "payments", label: "Payments", href: "payments.html", icon: "P" },
        { key: "invoices", label: "Invoices", href: "invoices.html", icon: "I" },
        { key: "reports", label: "Reports", href: "reports.html", icon: "R" },
        { key: "settings", label: "Settings", href: "settings.html", icon: "S" }
    ];

    const pageInitializers = {
        dashboard: initDashboardPage,
        members: () => window.GymPulseMembers && window.GymPulseMembers.initMembersPage(),
        "add-member": () => window.GymPulseMembers && window.GymPulseMembers.initMemberFormPage(),
        plans: () => window.GymPulsePlans && window.GymPulsePlans.initPlansPage(),
        attendance: () => window.GymPulseAttendance && window.GymPulseAttendance.initAttendancePage(),
        payments: () => window.GymPulsePayments && window.GymPulsePayments.initPaymentsPage(),
        invoices: () => window.GymPulseInvoices && window.GymPulseInvoices.initInvoicesPage(),
        reports: () => window.GymPulseReports && window.GymPulseReports.initReportsPage(),
        settings: () => window.GymPulseSettings && window.GymPulseSettings.initSettingsPage()
    };

    function redirectTo(path) {
        window.location.href = path;
    }

    function currentTheme() {
        return Storage.getData().settings.theme === "light" ? "light" : "dark";
    }

    function buildSidebar(pageKey, gymName) {
        return `
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="brand-mark"> <img src="assets/img/armour.png" alt="Armour Logo"></div>
                    <div>
                        <strong>${gymName}</strong>
                        <span>Smart Gym Manager</span>
                        <span class="sidebar-meta">${Utils.getBrandLinkMarkup("brand-link")}</span>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    ${navItems
                        .map(
                            (item) => `
                            <a href="${item.href}" class="sidebar-link ${item.key === pageKey ? "active" : ""}">
                                <span class="nav-icon">${item.icon}</span>
                                <span>${item.label}</span>
                            </a>`
                        )
                        .join("")}
                </nav>
            </aside>
        `;
    }

    function buildMobileMenu(pageKey, gymName) {
        return `
            <div class="offcanvas offcanvas-start app-offcanvas" tabindex="-1" id="mobileSidebar">
                <div class="offcanvas-header border-bottom border-secondary-subtle">
                    <div>
                        <h5 class="offcanvas-title mb-1">${gymName}</h5>
                        <small class="text-secondary-emphasis">Smart Gym Manager</small>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                </div>
                <div class="offcanvas-body">
                    <nav class="sidebar-nav">
                        ${navItems
                            .map(
                                (item) => `
                                <a href="${item.href}" class="sidebar-link ${item.key === pageKey ? "active" : ""}">
                                    <span class="nav-icon">${item.icon}</span>
                                    <span>${item.label}</span>
                                </a>`
                            )
                            .join("")}
                    </nav>
                </div>
            </div>
        `;
    }

    function wrapProtectedPage() {
        const body = document.body;
        const pageKey = body.dataset.page;
        const pageTitle = body.dataset.title || "GymPulse";
        const pageRoot = document.getElementById("page-root");
        const data = Storage.getData();
        const gymName = data.settings.gymName;
        const theme = currentTheme();

        if (!pageRoot) {
            return;
        }

        const pageMarkup = pageRoot.outerHTML;
        body.innerHTML = `
            <div class="app-shell">
                ${buildSidebar(pageKey, gymName)}
                <div class="main-column">
                    <header class="topbar">
                        <div class="topbar-inner">
                            <div class="topbar-title">
                                <button class="btn btn-outline-light mobile-toggle mb-3" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobileSidebar">
                                    Menu
                                </button>
                                <h1>${pageTitle}</h1>
                                <p>${gymName}</p>
                            </div>
                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                <button type="button" id="themeToggleBtn" class="btn btn-outline-light">
                                    ${theme === "dark" ? "Light Mode" : "Dark Mode"}
                                </button>
                                <span class="badge text-bg-warning text-dark px-3 py-2">${new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</span>
                                <button type="button" id="logoutBtn" class="btn btn-outline-warning">Logout</button>
                            </div>
                        </div>
                    </header>
                    <main class="content-area">${pageMarkup}</main>
                    <footer class="footer">${Utils.getBrandLinkMarkup("brand-link")}</footer>
                </div>
            </div>
            ${buildMobileMenu(pageKey, gymName)}
        `;

        const logoutBtn = document.getElementById("logoutBtn");
        const themeToggleBtn = document.getElementById("themeToggleBtn");

        if (logoutBtn) {
            logoutBtn.addEventListener("click", function () {
                Storage.clearSession();
                redirectTo("login.html");
            });
        }

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener("click", function () {
                const nextTheme = currentTheme() === "dark" ? "light" : "dark";
                Storage.updateSettings({ theme: nextTheme });
                Utils.applyTheme(nextTheme);
                window.location.reload();
            });
        }
    }

    function handleAuth() {
        const page = document.body.dataset.page;
        const requiresAuth = document.body.dataset.requiresAuth === "true";
        const hasAdmin = Storage.hasAdminSetup();

        if (page === "index") {
            redirectTo(Storage.isLoggedIn() && hasAdmin ? "dashboard.html" : "login.html");
            return false;
        }

        if (page === "login") {
            if (Storage.isLoggedIn() && hasAdmin) {
                redirectTo("dashboard.html");
                return false;
            }
            initLoginPage();
            return false;
        }

        if (requiresAuth && (!hasAdmin || !Storage.isLoggedIn())) {
            Storage.clearSession();
            redirectTo("login.html");
            return false;
        }

        if (requiresAuth) {
            wrapProtectedPage();
        }

        return true;
    }

    function initLoginPage() {
        const credentialSection = document.getElementById("credentialSection");
        const pinSection = document.getElementById("pinSection");
        const title = document.getElementById("loginModeTitle");
        const copy = document.getElementById("loginModeCopy");
        const setupForm = document.getElementById("setupForm");
        const credentialForm = document.getElementById("credentialForm");
        const pinForm = document.getElementById("pinForm");

        const data = Storage.getData();
        const settings = data.settings;
        const hasAdmin = Storage.hasAdminSetup();
        const hasPin = Boolean(settings.pinHash || settings.pin);

        if (!hasAdmin) {
            title.textContent = "Admin Setup";
            copy.textContent = "Create the first admin account to secure GymPulse.";
            setupForm.classList.remove("d-none");
            credentialSection.classList.add("d-none");
            pinSection.classList.add("d-none");
        } else {
            title.textContent = "Admin Login";
            copy.textContent = "Sign in with username and password. Use quick PIN if it has been configured.";
            setupForm.classList.add("d-none");
            credentialSection.classList.remove("d-none");
            pinSection.classList.toggle("d-none", !hasPin);
            document.getElementById("loginUsername").value = settings.adminUsername;
        }

        if (setupForm) {
            setupForm.addEventListener("submit", async function (event) {
                event.preventDefault();
                const username = document.getElementById("setupUsername").value.trim();
                const password = document.getElementById("setupPassword").value;
                const confirmPassword = document.getElementById("setupConfirmPassword").value;

                if (!username || password.length < 6) {
                    Utils.showAlert("Setup Error", "Username is required and password must be at least 6 characters.", "error");
                    return;
                }

                if (password !== confirmPassword) {
                    Utils.showAlert("Setup Error", "Password and confirm password do not match.", "error");
                    return;
                }

                const salt = Utils.generateSalt();
                const passwordHash = await Utils.hashSecret(password, salt);
                Storage.updateSettings({
                    adminUsername: username,
                    adminPasswordHash: passwordHash,
                    adminSalt: salt
                });
                Storage.setSession({ loggedIn: true, username });
                Utils.showToast("Admin account created successfully.");
                setTimeout(function () {
                    redirectTo("dashboard.html");
                }, 300);
            });
        }

        if (credentialForm) {
            credentialForm.addEventListener("submit", async function (event) {
                event.preventDefault();
                const username = document.getElementById("loginUsername").value.trim();
                const password = document.getElementById("loginPassword").value;
                const latestSettings = Storage.getData().settings;
                const isValidPassword = await Utils.verifySecret(password, latestSettings.adminSalt, latestSettings.adminPasswordHash);

                if (username !== latestSettings.adminUsername || !isValidPassword) {
                    Utils.showAlert("Login Failed", "Invalid username or password.", "error");
                    return;
                }

                Storage.setSession({ loggedIn: true, username });
                Utils.showToast("Login successful.");
                setTimeout(function () {
                    redirectTo("dashboard.html");
                }, 250);
            });
        }

        if (pinForm) {
            pinForm.addEventListener("submit", async function (event) {
                event.preventDefault();
                const pinInput = document.getElementById("quickPin");
                const latestSettings = Storage.getData().settings;
                let isValidPin = false;

                if (latestSettings.pinHash && latestSettings.pinSalt) {
                    isValidPin = await Utils.verifySecret(pinInput.value.trim(), latestSettings.pinSalt, latestSettings.pinHash);
                } else if (latestSettings.pin) {
                    isValidPin = pinInput.value.trim() === latestSettings.pin;
                }

                if (!isValidPin) {
                    Utils.showAlert("PIN Failed", "Incorrect quick PIN.", "error");
                    return;
                }

                Storage.setSession({ loggedIn: true, username: latestSettings.adminUsername });
                Utils.showToast("Quick login successful.");
                setTimeout(function () {
                    redirectTo("dashboard.html");
                }, 250);
            });
        }
    }

    function renderStatCards(stats, currency) {
        const container = document.getElementById("dashboardStats");
        if (!container) {
            return;
        }

        const cards = [
            { title: "Total Members", value: stats.totalMembers, helper: "Registered profiles", icon: "M" },
            { title: "Active Members", value: stats.activeMembers, helper: "Currently in valid plan", icon: "A" },
            { title: "Expired Members", value: stats.expiredMembers, helper: "Need renewal follow-up", icon: "E" },
            { title: "Today's Attendance", value: stats.todayAttendance, helper: "Members checked in today", icon: "T" },
            { title: "Total Revenue", value: Utils.formatCurrency(stats.totalRevenue, currency), helper: "Lifetime recorded collection", icon: "R" }
        ];

        container.innerHTML = cards
            .map(
                (card) => `
                <div class="col-md-6 col-xl">
                    <div class="metric-tile">
                        <div class="metric-icon">${card.icon}</div>
                        <span>${card.title}</span>
                        <strong>${card.value}</strong>
                        <small>${card.helper}</small>
                    </div>
                </div>`
            )
            .join("");
    }

    function destroyChart(chartKey) {
        if (charts[chartKey]) {
            charts[chartKey].destroy();
        }
    }

    function buildChart(canvasId, config, chartKey) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }
        destroyChart(chartKey);
        charts[chartKey] = new Chart(canvas, config);
    }

    function renderRecentPayments(data) {
        const tbody = document.getElementById("dashboardPaymentsTable");
        if (!tbody) {
            return;
        }

        const currency = data.settings.currency;
        const rows = [...data.payments]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        tbody.innerHTML = rows.length
            ? rows
                  .map(
                      (payment) => `
                    <tr>
                        <td>${payment.memberName}</td>
                        <td>${Utils.formatDate(payment.date)}</td>
                        <td>${payment.method}</td>
                        <td class="text-end">${Utils.formatCurrency(payment.amount, currency)}</td>
                    </tr>`
                  )
                  .join("")
            : Utils.renderEmptyState("No payments recorded yet.", 4);
    }

    function renderExpiringMembers(data) {
        const tbody = document.getElementById("expiringMembersTable");
        if (!tbody) {
            return;
        }

        const members = [...data.members]
            .filter((member) => {
                const status = Utils.getMemberStatus(member);
                return status.tone === "expiring" || status.tone === "expired";
            })
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
            .slice(0, 5);

        tbody.innerHTML = members.length
            ? members
                  .map((member) => {
                      const status = Utils.getMemberStatus(member);
                      return `
                        <tr>
                            <td>${member.name}</td>
                            <td>${Utils.getPlanLabel(member.plan, data)}</td>
                            <td>${Utils.formatDate(member.expiryDate)}</td>
                            <td><span class="status-pill status-${status.tone}">${status.label}</span></td>
                        </tr>`;
                  })
                  .join("")
            : Utils.renderEmptyState("No member records found.", 4);
    }

    function initDashboardPage() {
        const data = Storage.getData();
        const currency = data.settings.currency;
        const stats = Utils.getDashboardStats(data);
        renderStatCards(stats, currency);
        renderRecentPayments(data);
        renderExpiringMembers(data);

        const revenueSeries = Utils.getRevenueSeries(data.payments, 6);
        buildChart(
            "revenueChart",
            {
                type: "line",
                data: {
                    labels: revenueSeries.map((item) => item.label),
                    datasets: [
                        {
                            label: "Revenue",
                            data: revenueSeries.map((item) => item.total),
                            borderColor: Utils.getCssVar("--accent"),
                            backgroundColor: Utils.getCssVar("--chart-fill"),
                            fill: true,
                            tension: 0.35
                        }
                    ]
                },
                options: getChartOptions(currency)
            },
            "dashboardRevenue"
        );

        const attendanceSeries = Utils.getAttendanceSeries(data.attendance, 7);
        buildChart(
            "attendanceChart",
            {
                type: "bar",
                data: {
                    labels: attendanceSeries.map((item) => item.label),
                    datasets: [
                        {
                            label: "Check-ins",
                            data: attendanceSeries.map((item) => item.total),
                            backgroundColor: Utils.getCssVar("--chart-bar"),
                            borderRadius: 10
                        }
                    ]
                },
                options: getChartOptions()
            },
            "dashboardAttendance"
        );
    }

    function getChartOptions(currency) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: Utils.getCssVar("--text-main")
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: Utils.getCssVar("--text-muted")
                    },
                    grid: {
                        color: Utils.getCssVar("--chart-grid")
                    }
                },
                y: {
                    ticks: {
                        color: Utils.getCssVar("--text-muted"),
                        callback: currency
                            ? function (value) {
                                  return Utils.formatCurrency(value, currency);
                              }
                            : undefined
                    },
                    grid: {
                        color: Utils.getCssVar("--chart-grid")
                    }
                }
            }
        };
    }

    function boot() {
        Storage.init();
        Utils.applyTheme(Storage.getData().settings.theme);
        if (!handleAuth()) {
            return;
        }
        const initializer = pageInitializers[document.body.dataset.page];
        if (initializer) {
            initializer();
        }
    }

    document.addEventListener("DOMContentLoaded", boot);
})();
