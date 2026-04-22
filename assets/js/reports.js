(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function initReportsPage() {
        const summary = document.getElementById("reportSummary");
        const attendanceCanvas = document.getElementById("reportAttendanceChart");
        const paymentCanvas = document.getElementById("reportPaymentChart");
        const topAttendanceTable = document.getElementById("topAttendanceTable");
        const recentCollectionsTable = document.getElementById("recentCollectionsTable");

        const data = Storage.getData();
        const currency = data.settings.currency;
        const attendanceSeries = Utils.getAttendanceSeries(data.attendance, 14);
        const revenueByPlan = getRevenueByPlan(data);

        summary.innerHTML = [
            {
                label: "Total Revenue",
                value: Utils.formatCurrency(data.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency),
                note: "Overall payment collection"
            },
            {
                label: "Average Daily Attendance",
                value: (data.attendance.length / Math.max(attendanceSeries.length, 1)).toFixed(1),
                note: "Across the last 14 days"
            },
            {
                label: "Invoices Generated",
                value: data.invoices.length,
                note: "Stored invoice records"
            },
            {
                label: "Outstanding Balance",
                value: Utils.formatCurrency(data.members.reduce((sum, member) => sum + Utils.getMemberDue(member, data), 0), currency),
                note: "Pending from members"
            }
        ]
            .map(
                (item) => `
                <div class="col-md-6 col-xl-3">
                    <div class="metric-tile">
                        <span>${item.label}</span>
                        <strong>${item.value}</strong>
                        <small>${item.note}</small>
                    </div>
                </div>`
            )
            .join("");

        new Chart(attendanceCanvas, {
            type: "line",
            data: {
                labels: attendanceSeries.map((item) => item.label),
                datasets: [
                    {
                        label: "Attendance",
                        data: attendanceSeries.map((item) => item.total),
                        borderColor: Utils.getCssVar("--accent"),
                        backgroundColor: Utils.getCssVar("--chart-fill"),
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: getReportChartOptions()
        });

        new Chart(paymentCanvas, {
            type: "doughnut",
            data: {
                labels: revenueByPlan.labels,
                datasets: [
                    {
                        data: revenueByPlan.values,
                        backgroundColor: [
                            Utils.getCssVar("--accent"),
                            "#c99624",
                            "#8e6714",
                            "#ffd56a"
                        ]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: Utils.getCssVar("--text-main")
                        }
                    }
                }
            }
        });

        renderTopAttendance(data, topAttendanceTable);
        renderRecentCollections(data, recentCollectionsTable, currency);
    }

    function getRevenueByPlan(data) {
        const totals = {};
        data.payments.forEach((payment) => {
            const planLabel = payment.planName || Utils.getPlanLabel(payment.planId, data) || "Unknown";
            totals[planLabel] = (totals[planLabel] || 0) + Number(payment.amount || 0);
        });
        return {
            labels: Object.keys(totals),
            values: Object.values(totals)
        };
    }

    function renderTopAttendance(data, table) {
        const counts = {};
        data.attendance.forEach((item) => {
            counts[item.memberId] = (counts[item.memberId] || 0) + 1;
        });

        const rows = Object.entries(counts)
            .map(([memberId, count]) => {
                const member = data.members.find((item) => item.id === memberId);
                return {
                    name: member ? member.name : "Unknown",
                    plan: member ? Utils.getPlanLabel(member.plan) : "-",
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        table.innerHTML = rows.length
            ? rows
                  .map(
                      (row) => `
                        <tr>
                            <td>${row.name}</td>
                            <td>${row.plan}</td>
                            <td class="text-end">${row.count}</td>
                        </tr>`
                  )
                  .join("")
            : Utils.renderEmptyState("No attendance records available.", 3);
    }

    function renderRecentCollections(data, table, currency) {
        const rows = [...data.payments].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
        table.innerHTML = rows.length
            ? rows
                  .map(
                      (row) => `
                        <tr>
                            <td>${Utils.formatDate(row.date)}</td>
                            <td>${row.memberName}</td>
                            <td>${row.method}</td>
                            <td class="text-end">${Utils.formatCurrency(row.amount, currency)}</td>
                        </tr>`
                  )
                  .join("")
            : Utils.renderEmptyState("No recent payments found.", 4);
    }

    function getReportChartOptions() {
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
                    ticks: { color: Utils.getCssVar("--text-muted") },
                    grid: { color: Utils.getCssVar("--chart-grid") }
                },
                y: {
                    ticks: { color: Utils.getCssVar("--text-muted") },
                    grid: { color: Utils.getCssVar("--chart-grid") }
                }
            }
        };
    }

    window.GymPulseReports = {
        initReportsPage
    };
})();
