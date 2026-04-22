(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function initPlansPage() {
        const form = document.getElementById("planForm");
        const planIdInput = document.getElementById("planId");
        const formTitle = document.getElementById("planFormTitle");
        const nameInput = document.getElementById("planName");
        const durationValueInput = document.getElementById("planDurationValue");
        const durationUnitInput = document.getElementById("planDurationUnit");
        const priceInput = document.getElementById("planPrice");
        const descriptionInput = document.getElementById("planDescription");
        const tableBody = document.getElementById("plansTableBody");
        const summary = document.getElementById("planSummary");
        const resetButton = document.getElementById("planResetBtn");

        function renderSummary(data) {
            const totalPlans = data.plans.length;
            const averagePrice =
                totalPlans > 0
                    ? Math.round(data.plans.reduce((sum, plan) => sum + Number(plan.price || 0), 0) / totalPlans)
                    : 0;
            const activePlanUsage = data.members.filter((member) => data.plans.some((plan) => plan.id === member.plan)).length;

            summary.innerHTML = [
                { label: "Plans Created", value: totalPlans, note: "Membership products available" },
                { label: "Average Price", value: Utils.formatCurrency(averagePrice, data.settings.currency), note: "Average across all plans" },
                { label: "Members Assigned", value: activePlanUsage, note: "Members linked to valid plans" }
            ]
                .map(
                    (item) => `
                    <div class="col-md-4">
                        <div class="metric-tile">
                            <span>${item.label}</span>
                            <strong>${item.value}</strong>
                            <small>${item.note}</small>
                        </div>
                    </div>`
                )
                .join("");
        }

        function renderTable() {
            const data = Storage.getData();
            renderSummary(data);
            tableBody.innerHTML = data.plans.length
                ? data.plans
                      .map((plan) => {
                          const usageCount = data.members.filter((member) => member.plan === plan.id).length;
                          return `
                            <tr>
                                <td>
                                    <div class="member-name">${plan.name}</div>
                                    <div class="subtle-text">${plan.id}</div>
                                </td>
                                <td>${Utils.getPlanDurationLabel(plan)}</td>
                                <td class="text-end">${Utils.formatCurrency(plan.price, data.settings.currency)}</td>
                                <td class="subtle-text">${plan.description || "-"}</td>
                                <td>${usageCount}</td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-sm btn-outline-warning me-2 plan-edit-btn" data-id="${plan.id}">Edit</button>
                                    <button type="button" class="btn btn-sm btn-outline-light plan-delete-btn" data-id="${plan.id}">Delete</button>
                                </td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No plans available. Add your first membership plan.", 6);
        }

        function resetForm() {
            form.reset();
            planIdInput.value = "";
            formTitle.textContent = "Create Membership Plan";
            durationUnitInput.value = "days";
            durationValueInput.value = 30;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const durationValue = Number(durationValueInput.value || 0);
            const durationUnit = durationUnitInput.value;
            const payload = {
                name: nameInput.value.trim(),
                durationValue,
                durationUnit,
                durationDays: durationUnit === "months" ? durationValue * 30 : durationValue,
                price: Number(priceInput.value || 0),
                description: descriptionInput.value.trim()
            };

            if (!payload.name || payload.durationDays <= 0 || payload.price <= 0) {
                Utils.showAlert("Invalid Plan", "Plan name, duration, and price are required.", "error");
                return;
            }

            if (planIdInput.value) {
                Storage.updateItem("plans", planIdInput.value, payload);
                Utils.showToast("Plan updated successfully.");
            } else {
                Storage.addItem("plans", {
                    id: Utils.createId("plan"),
                    ...payload
                });
                Utils.showToast("Plan created successfully.");
            }

            resetForm();
            renderTable();
        });

        resetButton.addEventListener("click", resetForm);

        tableBody.addEventListener("click", async function (event) {
            const editButton = event.target.closest(".plan-edit-btn");
            const deleteButton = event.target.closest(".plan-delete-btn");
            const data = Storage.getData();

            if (editButton) {
                const plan = data.plans.find((item) => item.id === editButton.dataset.id);
                if (!plan) {
                    return;
                }
                planIdInput.value = plan.id;
                formTitle.textContent = "Edit Membership Plan";
                nameInput.value = plan.name;
                durationValueInput.value = plan.durationValue;
                durationUnitInput.value = plan.durationUnit;
                priceInput.value = plan.price;
                descriptionInput.value = plan.description || "";
                return;
            }

            if (!deleteButton) {
                return;
            }

            const plan = data.plans.find((item) => item.id === deleteButton.dataset.id);
            if (!plan) {
                return;
            }

            const linkedMembers = data.members.filter((member) => member.plan === plan.id);
            if (linkedMembers.length) {
                Utils.showAlert("Plan In Use", "This plan is assigned to existing members and cannot be deleted yet.", "error");
                return;
            }

            const confirmed = await Utils.confirmAction(
                "Delete Plan",
                `Remove the ${plan.name} plan from Armour Fitness Club?`,
                "Delete"
            );
            if (!confirmed) {
                return;
            }

            Storage.deleteItem("plans", plan.id);
            Utils.showToast("Plan deleted successfully.");
            renderTable();
        });

        resetForm();
        renderTable();
    }

    window.GymPulsePlans = {
        initPlansPage
    };
})();
