(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function initAttendancePage() {
        const summary = document.getElementById("attendanceSummary");
        const memberGrid = document.getElementById("attendanceMemberGrid");
        const todayTable = document.getElementById("todayAttendanceTable");
        const historyTable = document.getElementById("attendanceHistoryTable");
        const historyDateInput = document.getElementById("attendanceHistoryDate");
        const clearFilterBtn = document.getElementById("clearAttendanceFilter");

        function renderSummary(data) {
            const today = Utils.todayISO();
            const todayCount = data.attendance.filter((record) => record.date === today).length;
            const activeMembers = data.members.filter((member) => Utils.getMemberStatus(member).tone !== "expired").length;
            const absentCount = Math.max(activeMembers - todayCount, 0);
            const historyCount = data.attendance.length;

            summary.innerHTML = [
                { label: "Today's Check-ins", value: todayCount, note: "Attendance recorded today" },
                { label: "Active Members", value: activeMembers, note: "Eligible for check-in" },
                { label: "Absent Today", value: absentCount, note: "Active members not checked in" },
                { label: "Total Logs", value: historyCount, note: "Historical attendance entries" }
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
        }

        function renderMemberGrid(data) {
            const today = Utils.todayISO();
            const activeMembers = data.members.filter((member) => Utils.getMemberStatus(member).tone !== "expired");

            memberGrid.innerHTML = activeMembers.length
                ? activeMembers
                      .map((member) => {
                          const alreadyPresent = data.attendance.some(
                              (record) => record.memberId === member.id && record.date === today
                          );
                          const due = Utils.getMemberDue(member, data);
                          return `
                            <article class="attendance-card">
                                <div class="member-name">${member.name}</div>
                                <p>${Utils.getPlanLabel(member.plan)} · Due ${Utils.formatCurrency(due, data.settings.currency)}</p>
                                <button type="button" class="btn ${alreadyPresent ? "btn-outline-light" : "btn-warning"} w-100 attendance-btn" data-id="${member.id}" ${alreadyPresent ? "disabled" : ""}>
                                    ${alreadyPresent ? "Present Today" : "Mark Present"}
                                </button>
                            </article>`;
                      })
                      .join("")
                : '<div class="empty-state">No active members available for attendance.</div>';
        }

        function renderTodayTable(data) {
            const today = Utils.todayISO();
            const rows = data.attendance
                .filter((record) => record.date === today)
                .sort((a, b) => a.time.localeCompare(b.time));

            todayTable.innerHTML = rows.length
                ? rows
                      .map((record) => {
                          const member = data.members.find((item) => item.id === record.memberId);
                          return `
                            <tr>
                                <td>${record.memberName}</td>
                                <td>${member ? Utils.getPlanLabel(member.plan) : "-"}</td>
                                <td>${record.time}</td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No attendance recorded for today.", 3);
        }

        function renderHistoryTable(data) {
            const selectedDate = historyDateInput.value;
            const rows = [...data.attendance]
                .filter((record) => !selectedDate || record.date === selectedDate)
                .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

            historyTable.innerHTML = rows.length
                ? rows
                      .map((record) => {
                          const member = data.members.find((item) => item.id === record.memberId);
                          return `
                            <tr>
                                <td>${Utils.formatDate(record.date)}</td>
                                <td>${record.memberName}</td>
                                <td>${member ? Utils.getPlanLabel(member.plan) : "-"}</td>
                                <td>${record.time}</td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No attendance history found for the selected date.", 4);
        }

        function render() {
            const data = Storage.getData();
            renderSummary(data);
            renderMemberGrid(data);
            renderTodayTable(data);
            renderHistoryTable(data);
        }

        memberGrid.addEventListener("click", function (event) {
            const button = event.target.closest(".attendance-btn");
            if (!button) {
                return;
            }
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === button.dataset.id);
            if (!member) {
                return;
            }
            Storage.addItem("attendance", {
                id: Utils.createId("att"),
                memberId: member.id,
                memberName: member.name,
                date: Utils.todayISO(),
                time: Utils.formatTime(new Date())
            });
            Utils.showToast(`Attendance marked for ${member.name}.`);
            render();
        });

        historyDateInput.addEventListener("change", render);
        clearFilterBtn.addEventListener("click", function () {
            historyDateInput.value = "";
            render();
        });

        render();
    }

    window.GymPulseAttendance = {
        initAttendancePage
    };
})();
