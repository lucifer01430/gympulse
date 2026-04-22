(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function populatePlanSelect(select, selectedValue) {
        if (!select) {
            return;
        }

        const data = Storage.getData();
        const options = Utils.getPlanOptions(data);
        if (!options.length) {
            select.innerHTML = '<option value="">No plans available</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = options
            .map(
                (option) => `
                <option value="${option.value}" ${selectedValue === option.value ? "selected" : ""}>
                    ${option.label} | ${Utils.getPlanDurationLabel(option)} | ${Utils.formatCurrency(option.price, data.settings.currency)}
                </option>`
            )
            .join("");
    }

    function initMembersPage() {
        const searchInput = document.getElementById("memberSearch");
        const statusFilter = document.getElementById("memberStatusFilter");
        const planFilter = document.getElementById("memberPlanFilter");
        const pageSizeSelect = document.getElementById("memberPageSize");
        const tableBody = document.getElementById("membersTableBody");
        const visibleCount = document.getElementById("memberVisibleCount");
        const pageInfo = document.getElementById("memberPageInfo");
        const pageIndicator = document.getElementById("memberPageIndicator");
        const prevButton = document.getElementById("memberPrevPage");
        const nextButton = document.getElementById("memberNextPage");
        const state = {
            currentPage: 1,
            pageSize: Number(pageSizeSelect.value || 25)
        };

        function populatePlanFilter() {
            const data = Storage.getData();
            const currentValue = planFilter.value || "all";
            planFilter.innerHTML = '<option value="all">All Plans</option>';
            planFilter.innerHTML += Utils.getPlanOptions(data)
                .map((option) => `<option value="${option.value}">${option.label}</option>`)
                .join("");
            planFilter.value = currentValue;
        }

        function getFilteredMembers() {
            const data = Storage.getData();
            const searchValue = searchInput.value.trim().toLowerCase();
            const selectedStatus = statusFilter.value;
            const selectedPlan = planFilter.value;

            return data.members
                .filter((member) => {
                    const status = Utils.getMemberStatus(member);
                    const matchesSearch =
                        member.name.toLowerCase().includes(searchValue) ||
                        member.phone.toLowerCase().includes(searchValue) ||
                        Utils.getPlanLabel(member.plan, data).toLowerCase().includes(searchValue);
                    const matchesStatus =
                        selectedStatus === "all" ||
                        (selectedStatus === "expiring" && status.tone === "expiring") ||
                        status.tone === selectedStatus;
                    const matchesPlan = selectedPlan === "all" || member.plan === selectedPlan;
                    return matchesSearch && matchesStatus && matchesPlan;
                })
                .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        }

        function render() {
            const data = Storage.getData();
            const filteredMembers = getFilteredMembers();
            const totalItems = filteredMembers.length;
            const totalPages = Math.max(Math.ceil(totalItems / state.pageSize), 1);
            state.currentPage = Math.min(state.currentPage, totalPages);
            const startIndex = (state.currentPage - 1) * state.pageSize;
            const paginatedMembers = filteredMembers.slice(startIndex, startIndex + state.pageSize);

            visibleCount.textContent = totalItems;
            pageInfo.textContent = totalItems
                ? `Showing ${startIndex + 1}-${Math.min(startIndex + state.pageSize, totalItems)} of ${totalItems} members`
                : "Showing 0 of 0 members";
            pageIndicator.textContent = `Page ${state.currentPage} of ${totalPages}`;
            prevButton.disabled = state.currentPage === 1;
            nextButton.disabled = state.currentPage === totalPages || totalItems === 0;

            tableBody.innerHTML = paginatedMembers.length
                ? paginatedMembers
                      .map((member) => {
                          const status = Utils.getMemberStatus(member);
                          return `
                            <tr>
                                <td>
                                    <div class="member-name">${member.name}</div>
                                    <div class="subtle-text">ID: ${member.id}</div>
                                </td>
                                <td>${member.phone}</td>
                                <td><span class="plan-badge">${Utils.getPlanLabel(member.plan, data)}</span></td>
                                <td>${Utils.formatDate(member.joinDate)}</td>
                                <td>${Utils.formatDate(member.expiryDate)}</td>
                                <td><span class="status-pill status-${status.tone}">${status.label}</span></td>
                                <td class="subtle-text">${member.notes || "-"}</td>
                                <td class="text-end">
                                    <a href="add-member.html?id=${member.id}" class="btn btn-sm btn-outline-warning me-2">Edit</a>
                                    <button type="button" class="btn btn-sm btn-outline-light member-delete-btn" data-id="${member.id}">Delete</button>
                                </td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No members found.", 8);
        }

        function resetPaginationAndRender() {
            state.currentPage = 1;
            render();
        }

        searchInput.addEventListener("input", resetPaginationAndRender);
        statusFilter.addEventListener("change", resetPaginationAndRender);
        planFilter.addEventListener("change", resetPaginationAndRender);
        pageSizeSelect.addEventListener("change", function () {
            state.pageSize = Number(pageSizeSelect.value || 25);
            resetPaginationAndRender();
        });

        prevButton.addEventListener("click", function () {
            if (state.currentPage > 1) {
                state.currentPage -= 1;
                render();
            }
        });

        nextButton.addEventListener("click", function () {
            state.currentPage += 1;
            render();
        });

        tableBody.addEventListener("click", async function (event) {
            const deleteButton = event.target.closest(".member-delete-btn");
            if (!deleteButton) {
                return;
            }

            const memberId = deleteButton.dataset.id;
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === memberId);
            if (!member) {
                return;
            }

            const confirmed = await Utils.confirmAction(
                "Delete Member",
                `Remove ${member.name} from the member directory? Existing attendance, payments, and invoices will remain for audit history.`,
                "Delete"
            );
            if (!confirmed) {
                return;
            }

            Storage.deleteItem("members", memberId);
            Utils.showToast("Member removed successfully.");
            populatePlanFilter();
            render();
        });

        populatePlanFilter();
        render();
    }

    function initMemberFormPage() {
        const memberId = Utils.getQueryParam("id");
        const form = document.getElementById("memberForm");
        const idInput = document.getElementById("memberId");
        const title = document.getElementById("memberFormTitle");
        const nameInput = document.getElementById("memberName");
        const phoneInput = document.getElementById("memberPhone");
        const planSelect = document.getElementById("memberPlan");
        const joinDateInput = document.getElementById("memberJoinDate");
        const expiryDateInput = document.getElementById("memberExpiryDate");
        const notesInput = document.getElementById("memberNotes");
        const planName = document.getElementById("selectedPlanName");
        const planDuration = document.getElementById("selectedPlanDuration");
        const planPrice = document.getElementById("selectedPlanPrice");
        const planDescription = document.getElementById("selectedPlanDescription");
        const emptyPlansNotice = document.getElementById("emptyPlansNotice");
        const submitButton = form.querySelector('button[type="submit"]');

        function syncPlanSummary() {
            const data = Storage.getData();
            const plan = Utils.getPlanById(planSelect.value, data);
            if (!plan) {
                planName.textContent = "No plan selected";
                planDuration.textContent = "-";
                planPrice.textContent = "-";
                planDescription.textContent = "Create a membership plan first to onboard members.";
                return;
            }
            planName.textContent = plan.name;
            planDuration.textContent = Utils.getPlanDurationLabel(plan);
            planPrice.textContent = Utils.formatCurrency(plan.price, data.settings.currency);
            planDescription.textContent = plan.description || "No description added for this plan.";
        }

        function syncExpiryDate() {
            const data = Storage.getData();
            expiryDateInput.value = Utils.calculateExpiryDate(joinDateInput.value, planSelect.value, data);
            syncPlanSummary();
        }

        populatePlanSelect(planSelect);
        joinDateInput.value = Utils.todayISO();
        expiryDateInput.value = Utils.calculateExpiryDate(joinDateInput.value, planSelect.value, Storage.getData());
        syncPlanSummary();

        if (!Storage.getData().plans.length) {
            emptyPlansNotice.classList.remove("d-none");
            submitButton.disabled = true;
        }

        if (memberId) {
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === memberId);
            if (member) {
                title.textContent = "Edit Member";
                idInput.value = member.id;
                nameInput.value = member.name;
                phoneInput.value = member.phone;
                populatePlanSelect(planSelect, member.plan);
                joinDateInput.value = member.joinDate;
                expiryDateInput.value = member.expiryDate;
                notesInput.value = member.notes || "";
                syncPlanSummary();
            }
        }

        joinDateInput.addEventListener("change", syncExpiryDate);
        planSelect.addEventListener("change", syncExpiryDate);

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const payload = {
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                plan: planSelect.value,
                joinDate: joinDateInput.value,
                expiryDate: expiryDateInput.value,
                notes: notesInput.value.trim()
            };

            if (idInput.value) {
                Storage.updateItem("members", idInput.value, payload);
                Utils.showToast("Member updated successfully.");
            } else {
                Storage.addItem("members", {
                    id: Utils.createId("member"),
                    ...payload
                });
                Utils.showToast("Member added successfully.");
            }

            setTimeout(function () {
                window.location.href = "members.html";
            }, 350);
        });
    }

    window.GymPulseMembers = {
        initMembersPage,
        initMemberFormPage,
        populatePlanSelect
    };
})();
