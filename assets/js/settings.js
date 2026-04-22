(function () {
    const Storage = window.GymPulseStorage;
    const Utils = window.GymPulseUtils;

    function initSettingsPage() {
        const generalForm = document.getElementById("settingsForm");
        const securityForm = document.getElementById("securityForm");
        const gymNameInput = document.getElementById("gymName");
        const currencyInput = document.getElementById("currency");
        const usernameInput = document.getElementById("adminUsername");
        const passwordInput = document.getElementById("adminPassword");
        const confirmPasswordInput = document.getElementById("adminConfirmPassword");
        const pinInput = document.getElementById("accessPin");
        const disablePinInput = document.getElementById("disablePin");
        const exportBtn = document.getElementById("exportDataBtn");
        const importInput = document.getElementById("importDataFile");
        const resetBtn = document.getElementById("resetDemoBtn");

        function populateForms() {
            const settings = Storage.getData().settings;
            gymNameInput.value = settings.gymName;
            currencyInput.value = settings.currency;
            usernameInput.value = settings.adminUsername || "";
            pinInput.value = settings.pin || "";
            disablePinInput.checked = false;
        }

        generalForm.addEventListener("submit", function (event) {
            event.preventDefault();
            Storage.updateSettings({
                gymName: gymNameInput.value.trim(),
                currency: currencyInput.value
            });
            Utils.showToast("Gym settings updated.");
            setTimeout(function () {
                window.location.reload();
            }, 250);
        });

        securityForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const quickPin = pinInput.value.trim();
            const disablePin = disablePinInput.checked;
            const currentSettings = Storage.getData().settings;

            if (!username) {
                Utils.showAlert("Security Error", "Admin username is required.", "error");
                return;
            }

            if (password && password.length < 6) {
                Utils.showAlert("Security Error", "Password must be at least 6 characters.", "error");
                return;
            }

            if (password !== confirmPassword) {
                Utils.showAlert("Security Error", "Password and confirm password do not match.", "error");
                return;
            }

            const nextSettings = {
                adminUsername: username
            };

            if (password) {
                const adminSalt = Utils.generateSalt();
                nextSettings.adminSalt = adminSalt;
                nextSettings.adminPasswordHash = await Utils.hashSecret(password, adminSalt);
            } else {
                nextSettings.adminSalt = currentSettings.adminSalt;
                nextSettings.adminPasswordHash = currentSettings.adminPasswordHash;
            }

            if (disablePin) {
                nextSettings.pin = "";
                nextSettings.pinSalt = "";
                nextSettings.pinHash = "";
            } else if (quickPin) {
                const pinSalt = Utils.generateSalt();
                nextSettings.pin = "";
                nextSettings.pinSalt = pinSalt;
                nextSettings.pinHash = await Utils.hashSecret(quickPin, pinSalt);
            } else {
                nextSettings.pin = currentSettings.pin || "";
                nextSettings.pinSalt = currentSettings.pinSalt || "";
                nextSettings.pinHash = currentSettings.pinHash || "";
            }

            Storage.updateSettings(nextSettings);
            passwordInput.value = "";
            confirmPasswordInput.value = "";
            pinInput.value = "";
            disablePinInput.checked = false;
            Utils.showToast("Security settings updated.");
        });

        exportBtn.addEventListener("click", function () {
            const payload = JSON.stringify(Storage.getData(), null, 2);
            Utils.downloadTextFile("armour fitness club-backup.json", payload, "application/json");
            Utils.showToast("Backup exported successfully.");
        });

        importInput.addEventListener("change", function (event) {
            const file = event.target.files && event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = async function (loadEvent) {
                try {
                    const parsed = JSON.parse(loadEvent.target.result);
                    const confirmed = await Utils.confirmAction(
                        "Restore Backup",
                        "This will replace the current local Armour Fitness Club data with the imported backup.",
                        "Restore"
                    );
                    if (!confirmed) {
                        return;
                    }
                    Storage.resetData(parsed);
                    Storage.clearSession();
                    Utils.showToast("Backup restored successfully.");
                    setTimeout(function () {
                        window.location.href = "login.html";
                    }, 350);
                } catch (error) {
                    Utils.showAlert("Restore Failed", "Invalid JSON backup file.", "error");
                }
            };
            reader.readAsText(file);
        });

        resetBtn.addEventListener("click", async function () {
            const confirmed = await Utils.confirmAction(
                "Reset System",
                "Reset Armour Fitness Club to a clean empty operational state and clear the current session?",
                "Reset"
            );
            if (!confirmed) {
                return;
            }
            Storage.resetData();
            Storage.clearSession();
            Utils.showToast("System reset successfully.");
            setTimeout(function () {
                window.location.href = "login.html";
            }, 350);
        });

        populateForms();
    }

    window.GymPulseSettings = {
        initSettingsPage
    };
})();
