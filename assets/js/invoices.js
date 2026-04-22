(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function generateInvoiceNumber() {
        const stamp = Utils.todayISO().replace(/-/g, "");
        const suffix = String(Date.now()).slice(-4);
        return `AFC-${stamp}-${suffix}`;
    }

    function createInvoicePayload(member, billing, data, overrides) {
        const plan = billing ? billing.plan : null;
        const createdAt = overrides && overrides.createdAt ? overrides.createdAt : new Date().toISOString();
        return {
            id: overrides && overrides.id ? overrides.id : Utils.createId("inv"),
            invoiceNumber: overrides && overrides.invoiceNumber ? overrides.invoiceNumber : generateInvoiceNumber(),
            memberId: member ? member.id : "",
            memberName: member ? member.name : "",
            memberPhone: member ? member.phone : "",
            plan: member ? member.plan : "",
            planName: plan ? plan.name : "",
            planDuration: plan ? Utils.getPlanDurationLabel(plan) : "",
            totalAmount: billing ? billing.totalAmount : 0,
            paidAmount: billing ? billing.paidAmount : 0,
            dueAmount: billing ? billing.dueAmount : 0,
            amount: billing ? billing.totalAmount : 0,
            date: overrides && overrides.date ? overrides.date : Utils.todayISO(),
            description:
                (overrides && overrides.description) ||
                (plan ? `${plan.name} membership plan` : "Membership Plan"),
            gymName: data.settings.gymName || "ARMOUR FITNESS CLUB",
            currency: data.settings.currency,
            createdAt,
            isRegenerated: Boolean(overrides && overrides.isRegenerated),
            originalInvoiceId: (overrides && overrides.originalInvoiceId) || "",
            sourceInvoiceNumber: (overrides && overrides.sourceInvoiceNumber) || ""
        };
    }

    function buildPreview(invoice) {
        return `
            <div class="invoice-sheet">
                <div class="invoice-sheet-head">
                    <div class="invoice-sheet-brand">
                        <div class="invoice-logo-wrap">
                            <img src="assets/img/armour.png" alt="Armour Fitness Club logo" class="invoice-logo">
                        </div>
                        <div>
                            <div class="invoice-eyebrow">Professional Invoice</div>
                            <h4 class="mb-1">${Utils.escapeHtml(invoice.gymName || "ARMOUR FITNESS CLUB")}</h4>
                            <div class="subtle-text">Gym Management Billing Document</div>
                            <div class="subtle-text">${Utils.getBrandLinkMarkup("brand-link")}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="invoice-code">${invoice.invoiceNumber}</div>
                        <div class="subtle-text">Date ${Utils.formatDate(invoice.date)}</div>
                        <div class="subtle-text">Created ${Utils.formatTime(invoice.createdAt)}</div>
                    </div>
                </div>

                <div class="invoice-grid">
                    <div class="invoice-block">
                        <span>Bill To</span>
                        <strong>${Utils.escapeHtml(invoice.memberName || "-")}</strong>
                        <small>${Utils.escapeHtml(invoice.memberPhone || "-")}</small>
                    </div>
                    <div class="invoice-block">
                        <span>Plan Details</span>
                        <strong>${Utils.escapeHtml(invoice.planName || "-")}</strong>
                        <small>${Utils.escapeHtml(invoice.planDuration || "-")}</small>
                    </div>
                    <div class="invoice-block invoice-block-meta">
                        <span>Invoice Type</span>
                        <strong>${invoice.isRegenerated ? "Regenerated Invoice" : "Original Invoice"}</strong>
                        <small>${invoice.sourceInvoiceNumber ? `Source ${Utils.escapeHtml(invoice.sourceInvoiceNumber)}` : "Primary invoice record"}</small>
                    </div>
                </div>

                <div class="invoice-table-wrap">
                    <table class="invoice-detail-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="invoice-amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="invoice-description-title">${Utils.escapeHtml(invoice.description)}</div>
                                    <div class="invoice-description-subtext">Membership Plan</div>
                                </td>
                                <td class="invoice-amount-col">${Utils.formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="invoice-summary">
                    <div class="invoice-summary-row">
                        <span>Total</span>
                        <strong class="invoice-summary-value">${Utils.formatCurrency(invoice.totalAmount, invoice.currency)}</strong>
                    </div>
                    <div class="invoice-summary-row">
                        <span>Paid</span>
                        <strong class="invoice-summary-value">${Utils.formatCurrency(invoice.paidAmount, invoice.currency)}</strong>
                    </div>
                    <div class="invoice-summary-row invoice-summary-row-accent">
                        <span>Due</span>
                        <strong class="invoice-summary-value invoice-due-badge">${Utils.formatCurrency(invoice.dueAmount, invoice.currency)}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    async function downloadInvoicePdf(invoice) {
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) {
            Utils.showAlert("PDF Error", "jsPDF failed to load.", "error");
            return;
        }

        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const logoDataUrl = await Utils.loadImageAsDataUrl("assets/img/armour.png").catch(function () {
            return null;
        });
        const currency = invoice.currency || "INR";
        const totalText = Utils.formatCurrency(invoice.totalAmount, currency);
        const paidText = Utils.formatCurrency(invoice.paidAmount, currency);
        const dueText = Utils.formatCurrency(invoice.dueAmount, currency);
        const createdDate = Utils.formatDate(invoice.createdAt);
        const createdTime = Utils.formatTime(invoice.createdAt);
        const margin = 16;
        const contentWidth = 178;

        doc.setFillColor(248, 244, 236);
        doc.rect(0, 0, 210, 297, "F");

        doc.setFillColor(20, 20, 20);
        doc.roundedRect(margin, 12, contentWidth, 38, 6, 6, "F");

        if (logoDataUrl) {
            doc.addImage(logoDataUrl, "PNG", 18, 18, 18, 18);
        }

        doc.setTextColor(246, 196, 83);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("ARMOUR FITNESS CLUB", 42, 23);

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Professional Billing Invoice", 42, 30);
        doc.text(`Invoice No: ${String(invoice.invoiceNumber)}`, 186, 20, { align: "right" });
        doc.text(`Date: ${Utils.formatDate(invoice.date)}`, 186, 27, { align: "right" });
        doc.text(`Created: ${createdTime}`, 186, 34, { align: "right" });

        doc.setTextColor(32, 32, 32);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Bill To", 18, 62);
        doc.text("Plan Details", 112, 60);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(String(invoice.memberName || "-"), 18, 70);
        doc.text(`Phone: ${String(invoice.memberPhone || "-")}`, 18, 77);
        doc.text(String(invoice.planName || "-"), 112, 68);
        doc.text(`Duration: ${String(invoice.planDuration || "-")}`, 112, 75);

        doc.setDrawColor(218, 202, 173);
        doc.setFillColor(239, 229, 206);
        doc.roundedRect(margin, 90, contentWidth, 12, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Description", 22, 97.5);
        doc.text("Amount", 186, 97.5, { align: "right" });

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 216, 194);
        doc.roundedRect(margin, 104, contentWidth, 24, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Membership Plan", 22, 112);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(98, 98, 98);
        const descriptionLines = doc.splitTextToSize(String(invoice.description || "-"), 108);
        doc.text(descriptionLines, 22, 119);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(32, 32, 32);
        doc.text(totalText, 186, 114, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Summary", 132, 145);
        doc.line(132, 148, 188, 148);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Total", 132, 157);
        doc.text(totalText, 188, 157, { align: "right" });
        doc.text("Paid", 132, 167);
        doc.text(paidText, 188, 167, { align: "right" });

        doc.setFillColor(246, 196, 83);
        doc.roundedRect(132, 174, 56, 14, 4, 4, "F");
        doc.setTextColor(25, 25, 25);
        doc.setFont("helvetica", "bold");
        doc.text(`Due: ${dueText}`, 160, 183, { align: "center" });

        doc.setTextColor(92, 92, 92);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Created ${createdDate} at ${createdTime}`, 18, 268);
        doc.text("Generated by GymPulse Smart Gym Manager", 18, 275);
        doc.textWithLink("Developed by Harsh", 18, 282, { url: Utils.getResolvedBrandUrl() });

        doc.save(`${String(invoice.invoiceNumber)}.pdf`);
    }

    function initInvoicesPage() {
        const form = document.getElementById("invoiceForm");
        const memberSelect = document.getElementById("invoiceMember");
        const dateInput = document.getElementById("invoiceDate");
        const descriptionInput = document.getElementById("invoiceDescription");
        const amountInput = document.getElementById("invoiceAmount");
        const paidAmountInput = document.getElementById("invoicePaidAmount");
        const dueAmountInput = document.getElementById("invoiceDueAmount");
        const planPreviewInput = document.getElementById("invoicePlanName");
        const preview = document.getElementById("invoicePreview");
        const invoiceTable = document.getElementById("invoiceTable");
        const regeneratedTable = document.getElementById("regeneratedInvoiceTable");
        const previewDownloadBtn = document.getElementById("downloadPreviewInvoice");
        const historySearch = document.getElementById("invoiceHistorySearch");
        const regeneratedSearch = document.getElementById("regeneratedInvoiceSearch");

        let currentPreviewInvoice = null;
        let previewInvoiceNumber = generateInvoiceNumber();

        function syncMembers() {
            window.GymPulsePayments.buildMemberOptions(memberSelect);
        }

        function buildCurrentPreview() {
            const data = Storage.getData();
            const member = data.members.find((item) => item.id === memberSelect.value);
            const billing = member ? Utils.getMemberBilling(member, data) : null;
            currentPreviewInvoice = createInvoicePayload(member, billing, data, {
                invoiceNumber: previewInvoiceNumber,
                date: dateInput.value,
                description: descriptionInput.value.trim()
            });

            amountInput.value = Utils.formatCurrency(currentPreviewInvoice.totalAmount, currentPreviewInvoice.currency);
            paidAmountInput.value = Utils.formatCurrency(currentPreviewInvoice.paidAmount, currentPreviewInvoice.currency);
            dueAmountInput.value = Utils.formatCurrency(currentPreviewInvoice.dueAmount, currentPreviewInvoice.currency);
            planPreviewInput.value = currentPreviewInvoice.planName || "";
            preview.innerHTML = buildPreview(currentPreviewInvoice);
        }

        function matchInvoiceSearch(invoice, query) {
            if (!query) {
                return true;
            }
            const haystack = [
                invoice.invoiceNumber,
                invoice.memberName,
                invoice.planName,
                invoice.sourceInvoiceNumber
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        }

        function renderHistoryTable() {
            const data = Storage.getData();
            const query = historySearch.value.trim().toLowerCase();
            const rows = [...data.invoices]
                .filter((invoice) => matchInvoiceSearch(invoice, query))
                .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

            invoiceTable.innerHTML = rows.length
                ? rows
                      .map((invoice) => {
                          const created = Utils.formatDateTimeParts(invoice.createdAt);
                          return `
                            <tr>
                                <td>${invoice.invoiceNumber}</td>
                                <td>${invoice.memberName}</td>
                                <td>${invoice.planName || Utils.getPlanLabel(invoice.plan, data)}</td>
                                <td>${created.date}</td>
                                <td>${created.time}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.totalAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.paidAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.dueAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-sm btn-outline-warning me-2 invoice-download-btn" data-id="${invoice.id}">PDF</button>
                                    <button type="button" class="btn btn-sm btn-outline-light invoice-regenerate-btn" data-id="${invoice.id}">Regenerate</button>
                                </td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No invoices generated.", 9);
        }

        function renderRegeneratedTable() {
            const data = Storage.getData();
            const query = regeneratedSearch.value.trim().toLowerCase();
            const rows = [...data.regeneratedInvoices]
                .filter((invoice) => matchInvoiceSearch(invoice, query))
                .sort((a, b) => new Date(b.regeneratedAt || b.createdAt) - new Date(a.regeneratedAt || a.createdAt));

            regeneratedTable.innerHTML = rows.length
                ? rows
                      .map((invoice) => {
                          const created = Utils.formatDateTimeParts(invoice.regeneratedAt || invoice.createdAt);
                          return `
                            <tr>
                                <td><span class="status-pill status-expiring me-2">Regenerated</span>${invoice.invoiceNumber}</td>
                                <td>${invoice.sourceInvoiceNumber || invoice.originalInvoiceId || "-"}</td>
                                <td>${invoice.memberName}</td>
                                <td>${created.date}</td>
                                <td>${created.time}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.totalAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.paidAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">${Utils.formatCurrency(invoice.dueAmount, invoice.currency || data.settings.currency)}</td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-sm btn-outline-warning regenerated-download-btn" data-id="${invoice.id}">PDF</button>
                                </td>
                            </tr>`;
                      })
                      .join("")
                : Utils.renderEmptyState("No regenerated invoices yet.", 9);
        }

        function renderTables() {
            renderHistoryTable();
            renderRegeneratedTable();
        }

        async function handleRegenerateInvoice(invoiceId) {
            const data = Storage.getData();
            const invoice = data.invoices.find((item) => item.id === invoiceId);
            if (!invoice) {
                return;
            }

            const regeneratedInvoice = {
                ...invoice,
                id: Utils.createId("regen"),
                invoiceNumber: generateInvoiceNumber(),
                isRegenerated: true,
                originalInvoiceId: invoice.id,
                sourceInvoiceNumber: invoice.invoiceNumber,
                createdAt: new Date().toISOString(),
                regeneratedAt: new Date().toISOString()
            };

            Storage.addItem("regeneratedInvoices", regeneratedInvoice);
            Utils.showToast(`Invoice ${invoice.invoiceNumber} regenerated.`);
            renderRegeneratedTable();

            const tabTrigger = document.getElementById("regenerated-tab");
            if (tabTrigger) {
                bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
            }
        }

        dateInput.value = Utils.todayISO();
        syncMembers();
        buildCurrentPreview();
        renderTables();

        [memberSelect, dateInput, descriptionInput].forEach((element) => {
            element.addEventListener("input", buildCurrentPreview);
            element.addEventListener("change", buildCurrentPreview);
        });

        historySearch.addEventListener("input", renderHistoryTable);
        regeneratedSearch.addEventListener("input", renderRegeneratedTable);

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            buildCurrentPreview();
            if (!currentPreviewInvoice.memberId) {
                Utils.showAlert("Invoice Error", "Please select a member before generating the invoice.", "error");
                return;
            }

            Storage.addItem("invoices", currentPreviewInvoice);
            Utils.showToast(`Invoice ${currentPreviewInvoice.invoiceNumber} generated.`);
            form.reset();
            dateInput.value = Utils.todayISO();
            previewInvoiceNumber = generateInvoiceNumber();
            buildCurrentPreview();
            renderHistoryTable();
        });

        previewDownloadBtn.addEventListener("click", async function () {
            buildCurrentPreview();
            if (!currentPreviewInvoice.memberId) {
                Utils.showAlert("Invoice Error", "Select a member before downloading the invoice PDF.", "error");
                return;
            }
            await downloadInvoicePdf(currentPreviewInvoice);
        });

        invoiceTable.addEventListener("click", async function (event) {
            const downloadButton = event.target.closest(".invoice-download-btn");
            const regenerateButton = event.target.closest(".invoice-regenerate-btn");

            if (downloadButton) {
                const invoice = Storage.getData().invoices.find((item) => item.id === downloadButton.dataset.id);
                if (invoice) {
                    await downloadInvoicePdf(invoice);
                }
                return;
            }

            if (regenerateButton) {
                await handleRegenerateInvoice(regenerateButton.dataset.id);
            }
        });

        regeneratedTable.addEventListener("click", async function (event) {
            const downloadButton = event.target.closest(".regenerated-download-btn");
            if (!downloadButton) {
                return;
            }
            const invoice = Storage.getData().regeneratedInvoices.find((item) => item.id === downloadButton.dataset.id);
            if (invoice) {
                await downloadInvoicePdf(invoice);
            }
        });
    }

    window.GymPulseInvoices = {
        initInvoicesPage
    };
})();
