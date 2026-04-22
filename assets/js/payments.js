(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function buildMemberOptions(select, selectedValue) {
        const data = Storage.getData();
        select.innerHTML = data.members.length
            ? data.members
                  .map(
                      (member) => `
                        <option value="${member.id}" ${selectedValue === member.id ? "selected" : ""}>
                            ${member.name} - ${Utils.getPlanLabel(member.plan, data)}
                        </option>`
                  )
                  .join("")
            : '<option value="">No members found</option>';
    }

    function initPaymentsPage() {
        const form = document.getElementById("paymentForm");
        const memberSelect = document.getElementById("paymentMember");
        const dateInput = document.getElementById("paymentDate");
        const methodInput = document.getElementById("paymentMethod");
        const amountInput = document.getElementById("paymentAmount");
        const notesInput = document.getElementById("paymentNotes");
        const duePreview = document.getElementById("paymentDuePreview");
        const planAmountPreview = document.getElementById("planAmountPreview");
        const totalPaidPreview = document.getElementById("totalPaidPreview");
        const selectedPlanPreview = document.getElementById("selectedPaymentPlan");
        const summary = document.getElementById("paymentSummary");
        const historyFilter = document.getElementById("paymentHistoryMemberFilter");
        const historyTable = document.getElementById("paymentHistoryTable");

        function syncMemberOptions() {
            buildMemberOptions(memberSelect);
            historyFilter.innerHTML = '<option value="all">All Members</option>';
            historyFilter.innerHTML += Storage.getData().members
                .map((member) => `<option value="${member.id}">${member.name}</option>`)
                .join("");
        }

        function updateBillingPreview() {
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === memberSelect.value);
            if (!member) {
                duePreview.textContent = Utils.formatCurrency(0, data.settings.currency);
                planAmountPreview.textContent = Utils.formatCurrency(0, data.settings.currency);
                totalPaidPreview.textContent = Utils.formatCurrency(0, data.settings.currency);
                selectedPlanPreview.textContent = "No plan selected";
                return;
            }

            const billing = Utils.getMemberBilling(member, data);
            duePreview.textContent = Utils.formatCurrency(billing.dueAmount, data.settings.currency);
            planAmountPreview.textContent = Utils.formatCurrency(billing.totalAmount, data.settings.currency);
            totalPaidPreview.textContent = Utils.formatCurrency(billing.paidAmount, data.settings.currency);
            selectedPlanPreview.textContent = billing.plan ? billing.plan.name : "Unknown Plan";

            if (!amountInput.value) {
                amountInput.value = billing.dueAmount > 0 ? billing.dueAmount : 0;
            }
        }

        function renderSummary(data) {
            const currency = data.settings.currency;
            const today = Utils.todayISO();
            const totalRevenue = data.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const todayRevenue = data.payments
                .filter((payment) => payment.date === today)
                .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const outstanding = data.members.reduce((sum, member) => sum + Utils.getMemberDue(member, data), 0);
            const paymentsCount = data.payments.length;

            summary.innerHTML = [
                { label: "Total Revenue", value: Utils.formatCurrency(totalRevenue, currency), note: "All recorded collections" },
                { label: "Today's Revenue", value: Utils.formatCurrency(todayRevenue, currency), note: "Today's payment intake" },
                { label: "Outstanding Due", value: Utils.formatCurrency(outstanding, currency), note: "Balance still pending" },
                { label: "Payments Logged", value: paymentsCount, note: "Payment history entries" }
            ]
                .map(
                    (item) => `
                    <div class="col-md-6">
                        <div class="metric-tile">
                            <span>${item.label}</span>
                            <strong>${item.value}</strong>
                            <small>${item.note}</small>
                        </div>
                    </div>`
                )
                .join("");
        }

        function renderHistory(data) {
            const currency = data.settings.currency;
            const selectedMember = historyFilter.value;
            const rows = [...data.payments]
                .filter((payment) => selectedMember === "all" || payment.memberId === selectedMember)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            historyTable.innerHTML = rows.length
                ? rows
                      .map(
                          (payment) => `
                            <tr>
                                <td>${Utils.formatDate(payment.date)}</td>
                                <td>${payment.memberName}</td>
                                <td>${payment.planName || Utils.getPlanLabel(payment.planId, data)}</td>
                                <td>${payment.method}</td>
                                <td class="text-end">${Utils.formatCurrency(payment.amount, currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(payment.totalPaid, currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(payment.dueAmount, currency)}</td>
                                <td class="subtle-text">${payment.notes || "-"}</td>
                            </tr>`
                      )
                      .join("")
                : Utils.renderEmptyState("No payments available for the current filter.", 8);
        }

        function render() {
            const data = Storage.getData();
            syncMemberOptions();
            renderSummary(data);
            renderHistory(data);
            updateBillingPreview();
        }

        dateInput.value = Utils.todayISO();

        memberSelect.addEventListener("change", updateBillingPreview);
        historyFilter.addEventListener("change", function () {
            renderHistory(Storage.getData());
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === memberSelect.value);
            if (!member) {
                Utils.showAlert("Payment Error", "Please select a valid member.", "error");
                return;
            }

            const billing = Utils.getMemberBilling(member, data);
            const amount = Number(amountInput.value || 0);
            if (amount <= 0) {
                Utils.showAlert("Payment Error", "Enter a valid payment amount.", "error");
                return;
            }

            if (billing.dueAmount > 0 && amount > billing.dueAmount) {
                Utils.showAlert("Payment Error", "Payment amount cannot exceed the outstanding due.", "error");
                return;
            }

            const totalPaid = billing.paidAmount + amount;
            const dueLeft = Math.max(billing.totalAmount - totalPaid, 0);
            Storage.addItem("payments", {
                id: Utils.createId("pay"),
                memberId: member.id,
                memberName: member.name,
                planId: member.plan,
                planName: Utils.getPlanLabel(member.plan, data),
                amount,
                totalAmount: billing.totalAmount,
                previousPaid: billing.paidAmount,
                totalPaid,
                date: dateInput.value,
                method: methodInput.value,
                notes: notesInput.value.trim(),
                dueAmount: dueLeft
            });

            Utils.showToast(`Payment recorded for ${member.name}.`);
            form.reset();
            dateInput.value = Utils.todayISO();
            render();
        });

        render();
    }

    window.GymPulsePayments = {
        initPaymentsPage,
        buildMemberOptions
    };
})();
