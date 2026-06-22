<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t("settings.title") }}</h2>
    </div>

    <div class="settings-grid">
      <!-- System defaults -->
      <div class="card s-col-4">
        <div class="card-body">
          <div class="card-section-title">{{ t("settings.sysDefaults") }}</div>

          <div v-if="saveMsg" class="success-msg">{{ saveMsg }}</div>
          <div v-if="saveError" class="error-msg">{{ saveError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{
                t("settings.labelTimezone")
              }}</label>
              <select v-model="form.default_timezone" class="form-select">
                <option v-for="tz in timezones" :key="tz" :value="tz">
                  {{ tz }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{
                t("settings.labelMaxRetries")
              }}</label>
              <input
                v-model.number="form.default_max_retry"
                class="form-input"
                type="number"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-check">
              <input v-model="form.check_daily_run" type="checkbox" />
              <span>{{ t("settings.labelDailyRun") }}</span>
            </label>
            <p style="font-size: 12px; color: #888; margin: 4px 0 0 24px">
              {{ t("settings.dailyRunHint") }}
            </p>
          </div>

          <button
            class="btn btn-primary"
            :disabled="saving"
            @click="saveSettings"
          >
            <i class="fa-solid fa-floppy-disk"></i> {{ saving ? t("common.saving") : t("settings.saveBtn") }}
          </button>
        </div>
      </div>

      <!-- TG Notifications -->
      <div class="card s-col-4">
        <div class="card-body">
          <div class="card-section-title">
            {{ t("settings.notifySection") }}
          </div>
          <p style="font-size: 12px; color: #888; margin: 0 0 12px">
            {{ t("settings.notifyHint") }}
          </p>

          <div v-if="notifyMsg" class="success-msg">{{ notifyMsg }}</div>
          <div v-if="notifyError" class="error-msg">{{ notifyError }}</div>

          <div class="form-group">
            <label class="form-label">{{
              t("settings.labelNotifyUsername")
            }}</label>
            <input
              v-model.trim="notifyForm.username"
              class="form-input"
              :placeholder="t('settings.notifyUsernamePlaceholder')"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{
              t("settings.labelNotifyEvents")
            }}</label>
            <div class="event-pills">
              <label
                v-for="ev in notifyEventOptions"
                :key="ev.value"
                class="event-pill"
                :class="{ active: notifyForm.events.includes(ev.value) }"
              >
                <input
                  type="checkbox"
                  :checked="notifyForm.events.includes(ev.value)"
                  @change="toggleNotifyEvent(ev.value)"
                />
                {{ ev.label }}
              </label>
            </div>
          </div>

          <button
            class="btn btn-primary"
            :disabled="notifySaving"
            @click="saveNotify"
          >
            <i class="fa-solid fa-floppy-disk"></i> {{ notifySaving ? t("common.saving") : t("settings.saveBtn") }}
          </button>
        </div>
      </div>

      <!-- Admin credentials -->
      <div class="card s-col-4">
        <div class="card-body">
          <div class="card-section-title">{{ t("settings.adminCreds") }}</div>

          <div v-if="credMsg" class="success-msg">{{ credMsg }}</div>
          <div v-if="credError" class="error-msg">{{ credError }}</div>

          <div class="form-group">
            <label class="form-label">
              {{ t("settings.labelNewUsername") }}
              <span style="font-weight: 400; color: #aaa">
                {{ t("settings.hintKeepBlank") }}</span
              >
            </label>
            <input
              v-model.trim="cred.username"
              class="form-input"
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label class="form-label">
              {{ t("settings.labelNewPassword") }}
              <span style="font-weight: 400; color: #aaa">
                {{ t("settings.hintKeepBlank") }}</span
              >
            </label>
            <input
              v-model="cred.newPassword"
              class="form-input"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <div class="form-group">
            <label class="form-label"
              >{{ t("settings.labelCurrentPass") }}
              <span style="color: #e63946">*</span></label
            >
            <input
              v-model="cred.currentPassword"
              class="form-input"
              type="password"
              autocomplete="current-password"
            />
          </div>

          <button
            class="btn btn-primary"
            :disabled="credSaving"
            @click="saveCredentials"
          >
            <i class="fa-solid fa-shield-halved"></i> {{ credSaving ? t("common.saving") : t("settings.updateBtn") }}
          </button>
        </div>
      </div>

      <!-- Emby defaults -->
      <div class="card s-col-6">
        <div class="card-body">
          <div class="card-section-title">{{ t("settings.embyDefaults") }}</div>

          <div v-if="embyMsg" class="success-msg">{{ embyMsg }}</div>
          <div v-if="embyError" class="error-msg">{{ embyError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{
                t("settings.labelPlayDuration")
              }}</label>
              <input
                v-model.number="form.default_play_duration"
                class="form-input"
                type="number"
                min="30"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{
                t("settings.labelDeviceName")
              }}</label>
              <input
                v-model.trim="form.default_device_name"
                class="form-input"
                placeholder="Mac"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t("settings.labelUserAgent") }}</label>
            <select v-model="form.default_ua" class="form-select">
              <option value="">— {{ t("jobs.uaDefault") }} —</option>
              <option v-for="p in uaPresets" :key="p.name" :value="p.value">{{ p.name }}</option>
            </select>
          </div>

          <div style="margin-bottom:16px">
            <div class="card-section-title" style="margin-bottom:10px">{{ t("settings.uaPresetsSection") }}</div>
            <div v-for="(p, i) in uaPresets" :key="i" class="ua-preset-row">
              <span class="ua-preset-name">{{ p.name }}</span>
              <span class="ua-preset-value">{{ p.value }}</span>
              <button class="btn btn-sm btn-ghost ua-preset-del" :title="t('settings.uaPresetDeleteTip')" @click="removeUaPreset(i)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="ua-preset-add">
              <input v-model.trim="newPresetName" class="form-input" style="flex:0 0 140px" :placeholder="t('settings.uaPresetName')" @keyup.enter="addUaPreset" />
              <input v-model.trim="newPresetValue" class="form-input" style="flex:1;min-width:0" :placeholder="t('settings.uaPresetValue')" @keyup.enter="addUaPreset" />
              <button class="btn btn-ghost btn-sm" :disabled="!newPresetName || !newPresetValue" @click="addUaPreset">
                <i class="fa-solid fa-plus"></i> {{ t("settings.addPreset") }}
              </button>
            </div>
          </div>

          <button
            class="btn btn-primary"
            :disabled="embySaving"
            @click="saveEmby"
          >
            <i class="fa-solid fa-floppy-disk"></i> {{ embySaving ? t("common.saving") : t("settings.saveBtn") }}
          </button>
        </div>
      </div>

      <!-- Proxies -->
      <div class="card s-col-6">
        <div class="card-body">
          <div class="card-section-title">{{ t("settings.proxiesSection") }}</div>
          <p style="font-size:12px;color:#888;margin:0 0 12px">{{ t("settings.proxiesHint") }}</p>

          <div v-if="proxiesMsg" class="success-msg">{{ proxiesMsg }}</div>
          <div v-if="proxiesError" class="error-msg">{{ proxiesError }}</div>

          <div v-for="(p, i) in proxies" :key="p.id" class="ua-preset-row">
            <span class="ua-preset-name">{{ p.name }}</span>
            <span class="ua-preset-value">{{ p.url }}</span>
            <button class="btn btn-sm btn-ghost ua-preset-del" :title="t('settings.proxyDeleteTip')" @click="removeProxy(i)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ua-preset-add">
            <input v-model.trim="newProxyName" class="form-input" style="flex:0 0 140px" :placeholder="t('settings.proxyName')" @keyup.enter="addProxy" />
            <input v-model.trim="newProxyUrl" class="form-input" style="flex:1;min-width:0" :placeholder="t('settings.proxyUrl')" @keyup.enter="addProxy" />
            <button class="btn btn-ghost btn-sm" :disabled="!newProxyName || !newProxyUrl" @click="addProxy">
              <i class="fa-solid fa-plus"></i> {{ t("settings.addProxy") }}
            </button>
          </div>

          <button class="btn btn-primary" style="margin-top:14px" :disabled="proxiesSaving" @click="saveProxies">
            <i class="fa-solid fa-floppy-disk"></i> {{ proxiesSaving ? t("common.saving") : t("settings.saveBtn") }}
          </button>
        </div>
      </div>

      <!-- Import / Export -->
      <div class="card s-col-6">
        <div class="card-body">
          <div class="card-section-title">
            {{ t("settings.importExport.title") }}
          </div>

          <div v-if="importMsg" class="success-msg">{{ importMsg }}</div>
          <div v-if="importError" class="error-msg">{{ importError }}</div>

          <div class="form-group">
            <p style="font-size: 12px; color: #888; margin: 0 0 8px">
              {{ t("settings.importExport.exportHint") }}
            </p>
            <button class="btn btn-secondary" @click="doExport">
              <i class="fa-solid fa-file-export"></i> {{ t("settings.importExport.exportBtn") }}
            </button>
          </div>

          <hr class="ie-divider" />

          <div class="form-group">
            <label class="form-label">{{
              t("settings.importExport.importLabel")
            }}</label>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              class="form-input"
              @change="onFileChange"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{
              t("settings.importExport.importMode")
            }}</label>
            <div class="import-mode-row">
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="merge" />
                <div>
                  <div class="import-mode-label">
                    {{ t("settings.importExport.modeMerge") }}
                  </div>
                  <div class="import-mode-hint">
                    {{ t("settings.importExport.modeMergeHint") }}
                  </div>
                </div>
              </label>
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="replace" />
                <div>
                  <div class="import-mode-label">
                    {{ t("settings.importExport.modeReplace") }}
                  </div>
                  <div class="import-mode-hint">
                    {{ t("settings.importExport.modeReplaceHint") }}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <button
            class="btn btn-primary"
            :disabled="importing"
            @click="doImport"
          >
            <i class="fa-solid fa-file-import"></i>
            {{
              importing
                ? t("settings.importExport.importing")
                : t("settings.importExport.importBtn")
            }}
          </button>
        </div>
      </div>

      <!-- AI button detection -->
      <div class="card s-col-12">
        <div class="card-body">
          <div class="card-section-title">{{ t("settings.aiSection") }}</div>
          <p style="font-size: 12px; color: #888; margin: 0 0 16px">
            {{ t("settings.aiHint") }}
          </p>

          <!-- Providers list -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="card-section-title" style="margin:0">{{ t("settings.aiProvidersSection") }}</div>
            <button class="btn btn-ghost btn-sm" @click="showAddSupplier = true">
              <i class="fa-solid fa-plus"></i> {{ t("settings.addProvider") }}
            </button>
          </div>

          <div v-if="aiSuppliersLoading" style="color:#888;font-size:13px">{{ t("common.loading") }}</div>
          <div v-else-if="!suppliers.length" style="color:#aaa;font-size:13px;margin-bottom:12px">{{ t("settings.noSuppliers") }}</div>

          <div v-for="s in suppliers" :key="s.id" class="supplier-card">
            <!-- Supplier header -->
            <div v-if="editingSupplierId !== s.id" class="supplier-header">
              <div class="supplier-info">
                <span class="supplier-name">{{ s.name }}</span>
                <span class="supplier-url">{{ s.base_url }}</span>
                <span class="supplier-timeout">{{ s.timeout_ms }}ms</span>
              </div>
              <div class="supplier-actions">
                <button class="btn btn-ghost btn-sm" @click="startEditSupplier(s)">{{ t("settings.editSupplier") }}</button>
                <button class="btn btn-ghost btn-sm btn-danger" @click="removeSupplier(s.id)"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
            <div v-if="editingSupplierId !== s.id && !s.api_key" class="supplier-no-key-warning">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ t("settings.supplierNoApiKey") }}
            </div>

            <!-- Supplier edit form -->
            <div v-if="editingSupplierId === s.id" class="supplier-edit-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t("settings.supplierName") }}</label>
                  <input v-model.trim="editForm.name" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ t("settings.supplierTimeout") }}</label>
                  <input v-model.number="editForm.timeout_ms" class="form-input" type="number" min="1000" step="1000" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.supplierBaseUrl") }}</label>
                <input v-model.trim="editForm.base_url" class="form-input" placeholder="https://openrouter.ai/api/v1" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.supplierApiKey") }}</label>
                <input v-model.trim="editForm.api_key" class="form-input" type="text" autocomplete="off" placeholder="sk-..." />
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" :disabled="supplierSaving" @click="saveEditSupplier(s.id)">
                  {{ supplierSaving ? t("common.saving") : t("settings.saveSupplier") }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="editingSupplierId = null">{{ t("settings.cancelEdit") }}</button>
              </div>
            </div>

            <!-- Models -->
            <div class="supplier-models">
              <div class="supplier-models-label">{{ t("settings.supplierModels") }}</div>
              <div class="supplier-model-chips">
                <span v-for="m in s.models" :key="m.id" class="model-chip">
                  {{ m.model_id }}
                  <button class="model-chip-del" @click="removeModel(s.id, m.id)"><i class="fa-solid fa-xmark"></i></button>
                </span>
                <span v-if="!s.models.length" style="color:#aaa;font-size:12px">—</span>
              </div>
              <div class="model-add-row">
                <input
                  v-model.trim="newModelInputs[s.id]"
                  class="form-input form-input-sm"
                  :placeholder="t('settings.modelId')"
                  @keyup.enter="addModel(s.id)"
                />
                <button class="btn btn-ghost btn-sm" :disabled="!newModelInputs[s.id]" @click="addModel(s.id)">
                  <i class="fa-solid fa-plus"></i> {{ t("settings.addModel") }}
                </button>
              </div>
            </div>
          </div>

          <!-- Add supplier form -->
          <div v-if="showAddSupplier" class="supplier-card supplier-edit-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ t("settings.supplierName") }}</label>
                <input v-model.trim="newSupplierForm.name" class="form-input" placeholder="OpenRouter" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.supplierTimeout") }}</label>
                <input v-model.number="newSupplierForm.timeout_ms" class="form-input" type="number" min="1000" step="1000" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t("settings.supplierBaseUrl") }}</label>
              <input v-model.trim="newSupplierForm.base_url" class="form-input" placeholder="https://openrouter.ai/api/v1" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t("settings.supplierApiKey") }}</label>
              <input v-model.trim="newSupplierForm.api_key" class="form-input" type="text" autocomplete="off" placeholder="sk-..." />
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" :disabled="supplierSaving || !newSupplierForm.name || !newSupplierForm.base_url" @click="createSupplier">
                {{ supplierSaving ? t("common.saving") : t("settings.saveSupplier") }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="showAddSupplier = false">{{ t("settings.cancelEdit") }}</button>
            </div>
          </div>

          <div v-if="supplierError" class="error-msg" style="margin-top:8px">{{ supplierError }}</div>

          <!-- Default model -->
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">
            <div class="form-group">
              <label class="form-label">{{ t("settings.defaultModel") }}</label>
              <select v-model="form.ai_model" class="form-select">
                <option value="">{{ t("settings.defaultModelNone") }}</option>
                <optgroup v-for="s in suppliers" :key="s.id" :label="s.name">
                  <option v-for="m in s.models" :key="m.id" :value="m.model_id">{{ m.model_id }}</option>
                </optgroup>
              </select>
            </div>
            <div v-if="aiMsg" class="success-msg">{{ aiMsg }}</div>
            <div v-if="aiError" class="error-msg">{{ aiError }}</div>
            <button class="btn btn-primary" :disabled="aiSaving" @click="saveAi">
              <i class="fa-solid fa-floppy-disk"></i> {{ aiSaving ? t("common.saving") : t("settings.saveDefaultModel") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { settingsApi, authApi, dataApi, aiSuppliersApi } from "../api/client";
import type { ExportPayload, UAPreset, AiSupplier, Proxy } from "../api/client";
import { t } from "../i18n";

const timezones = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

const form = reactive({
  default_timezone: "Australia/Sydney",
  default_max_retry: 5,
  check_daily_run: true,
  default_ua: "",
  default_play_duration: 300,
  default_device_name: "Mac",
  ai_model: "",
});
const saving = ref(false);
const saveMsg = ref("");
const saveError = ref("");

const embySaving = ref(false);
const embyMsg = ref("");
const embyError = ref("");

const aiSaving = ref(false);
const aiMsg = ref("");
const aiError = ref("");

const suppliers = ref<AiSupplier[]>([]);
const aiSuppliersLoading = ref(false);
const editingSupplierId = ref<number | null>(null);
const editForm = reactive({ name: '', base_url: '', api_key: '', timeout_ms: 25000 });
const newSupplierForm = reactive({ name: '', base_url: '', api_key: '', timeout_ms: 25000 });
const showAddSupplier = ref(false);
const supplierSaving = ref(false);
const supplierError = ref('');
const newModelInputs = ref<Record<number, string>>({});

const notifyForm = reactive({ username: "", events: ["failed"] as string[] });
const notifySaving = ref(false);
const notifyMsg = ref("");
const notifyError = ref("");

const uaPresets = ref<UAPreset[]>([]);
const newPresetName = ref("");
const newPresetValue = ref("");

const proxies = ref<Proxy[]>([]);
const newProxyName = ref("");
const newProxyUrl = ref("");
const proxiesSaving = ref(false);
const proxiesMsg = ref("");
const proxiesError = ref("");

const notifyEventOptions = computed(() => [
  { value: "failed", label: t("settings.notifyEventFailed") },
  { value: "success", label: t("settings.notifyEventSuccess") },
]);

function toggleNotifyEvent(value: string) {
  const idx = notifyForm.events.indexOf(value);
  if (idx === -1) notifyForm.events.push(value);
  else notifyForm.events.splice(idx, 1);
}

const cred = reactive({ username: "", newPassword: "", currentPassword: "" });
const credSaving = ref(false);
const credMsg = ref("");
const credError = ref("");

onMounted(async () => {
  try {
    const s = await settingsApi.get();
    form.default_timezone = s.default_timezone;
    form.default_max_retry = Number(s.default_max_retry);
    form.check_daily_run = s.check_daily_run !== "false";
    form.default_ua = s.default_ua ?? "";
    try { uaPresets.value = JSON.parse(s.ua_presets ?? "[]"); } catch { uaPresets.value = []; }
    try { proxies.value = JSON.parse(s.proxies ?? "[]"); } catch { proxies.value = []; }
    form.default_play_duration = Number(s.default_play_duration ?? 300);
    form.default_device_name = s.default_device_name ?? "Mac";
    form.ai_model = s.ai_model ?? "";
    notifyForm.username = s.notify_tg_username ?? "";
    try {
      if (s.notify_tg_events)
        notifyForm.events = JSON.parse(s.notify_tg_events);
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
  try {
    aiSuppliersLoading.value = true;
    suppliers.value = await aiSuppliersApi.list();
  } catch {
    /* ignore */
  } finally {
    aiSuppliersLoading.value = false;
  }
});

async function saveSettings() {
  saveMsg.value = "";
  saveError.value = "";
  saving.value = true;
  try {
    await settingsApi.update({
      default_timezone: form.default_timezone,
      default_max_retry: String(form.default_max_retry),
      check_daily_run: String(form.check_daily_run),
    });
    saveMsg.value = t("settings.saved");
  } catch (err: any) {
    saveError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    saving.value = false;
  }
}

function addUaPreset() {
  const name = newPresetName.value.trim();
  const value = newPresetValue.value.trim();
  if (!name || !value) return;
  uaPresets.value.push({ name, value });
  newPresetName.value = "";
  newPresetValue.value = "";
}

function removeUaPreset(index: number) {
  // If the default UA matches the removed preset, clear it
  if (form.default_ua === uaPresets.value[index]?.value) form.default_ua = "";
  uaPresets.value.splice(index, 1);
}

function addProxy() {
  const name = newProxyName.value.trim();
  const url = newProxyUrl.value.trim();
  if (!name || !url) return;
  proxies.value.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name, url });
  newProxyName.value = "";
  newProxyUrl.value = "";
}

function removeProxy(index: number) {
  proxies.value.splice(index, 1);
}

async function saveProxies() {
  proxiesMsg.value = "";
  proxiesError.value = "";
  proxiesSaving.value = true;
  try {
    await settingsApi.update({ proxies: JSON.stringify(proxies.value) });
    proxiesMsg.value = t("settings.saved");
  } catch (err: any) {
    proxiesError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    proxiesSaving.value = false;
  }
}

async function saveEmby() {
  embyMsg.value = "";
  embyError.value = "";
  embySaving.value = true;
  try {
    await settingsApi.update({
      default_ua: form.default_ua,
      default_play_duration: String(form.default_play_duration),
      default_device_name: form.default_device_name,
      ua_presets: JSON.stringify(uaPresets.value),
    });
    embyMsg.value = t("settings.saved");
  } catch (err: any) {
    embyError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    embySaving.value = false;
  }
}

async function saveAi() {
  aiMsg.value = "";
  aiError.value = "";
  aiSaving.value = true;
  try {
    await settingsApi.update({ ai_model: form.ai_model });
    aiMsg.value = t("settings.saved");
  } catch (err: any) {
    aiError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    aiSaving.value = false;
  }
}

async function reloadSuppliers() {
  suppliers.value = await aiSuppliersApi.list();
}

function startEditSupplier(s: AiSupplier) {
  editingSupplierId.value = s.id;
  editForm.name = s.name;
  editForm.base_url = s.base_url;
  editForm.api_key = s.api_key;
  editForm.timeout_ms = s.timeout_ms;
}

async function saveEditSupplier(id: number) {
  supplierError.value = '';
  supplierSaving.value = true;
  try {
    await aiSuppliersApi.update(id, { ...editForm });
    editingSupplierId.value = null;
    await reloadSuppliers();
  } catch (err: any) {
    supplierError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    supplierSaving.value = false;
  }
}

async function createSupplier() {
  supplierError.value = '';
  supplierSaving.value = true;
  try {
    await aiSuppliersApi.create({ ...newSupplierForm });
    showAddSupplier.value = false;
    newSupplierForm.name = '';
    newSupplierForm.base_url = '';
    newSupplierForm.api_key = '';
    newSupplierForm.timeout_ms = 25000;
    await reloadSuppliers();
  } catch (err: any) {
    supplierError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    supplierSaving.value = false;
  }
}

async function removeSupplier(id: number) {
  supplierError.value = '';
  try {
    await aiSuppliersApi.remove(id);
    await reloadSuppliers();
  } catch (err: any) {
    supplierError.value = err.response?.data?.error ?? t("settings.saveFailed");
  }
}

async function addModel(supplierId: number) {
  const modelId = newModelInputs.value[supplierId]?.trim();
  if (!modelId) return;
  supplierError.value = '';
  try {
    await aiSuppliersApi.addModel(supplierId, modelId);
    newModelInputs.value[supplierId] = '';
    await reloadSuppliers();
  } catch (err: any) {
    supplierError.value = err.response?.data?.error ?? t("settings.saveFailed");
  }
}

async function removeModel(supplierId: number, modelId: number) {
  supplierError.value = '';
  try {
    await aiSuppliersApi.removeModel(supplierId, modelId);
    await reloadSuppliers();
  } catch (err: any) {
    supplierError.value = err.response?.data?.error ?? t("settings.saveFailed");
  }
}

async function saveNotify() {
  notifyMsg.value = "";
  notifyError.value = "";
  notifySaving.value = true;
  try {
    await settingsApi.update({
      notify_tg_username: notifyForm.username,
      notify_tg_events: JSON.stringify(notifyForm.events),
    });
    notifyMsg.value = t("settings.saved");
  } catch (err: any) {
    notifyError.value = err.response?.data?.error ?? t("settings.saveFailed");
  } finally {
    notifySaving.value = false;
  }
}

// ── Import / Export ───────────────────────────────────────────────────────────

const fileInput = ref<HTMLInputElement | null>(null);
const importFile = ref<File | null>(null);
const importMode = ref<"merge" | "replace">("merge");
const importing = ref(false);
const importMsg = ref("");
const importError = ref("");

function onFileChange(e: Event) {
  importFile.value =
    (e.target as HTMLInputElement).files?.[0] ?? null;
}

async function doExport() {
  const ok = confirm(t("settings.importExport.exportWarning"));
  if (!ok) return;
  try {
    const data = await dataApi.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `bemby-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    importError.value =
      err.response?.data?.error ?? t("settings.importExport.importFailed");
  }
}

async function doImport() {
  importMsg.value = "";
  importError.value = "";
  if (!importFile.value) {
    importError.value = t("settings.importExport.noFileSelected");
    return;
  }
  if (importMode.value === "replace") {
    const ok = confirm(t("settings.importExport.replaceWarning"));
    if (!ok) return;
  }
  importing.value = true;
  try {
    const text = await importFile.value.text();
    let parsed: ExportPayload;
    try {
      parsed = JSON.parse(text);
    } catch {
      importError.value = t("settings.importExport.invalidFile");
      return;
    }
    const result = await dataApi.import(parsed, importMode.value);
    importMsg.value = t("settings.importExport.importSuccess")
      .replace("{a}", String(result.accountsImported))
      .replace("{t}", String(result.templatesImported))
      .replace("{j}", String(result.jobsImported))
      .replace("{s}", String(result.settingsUpdated));
    if (fileInput.value) fileInput.value.value = "";
    importFile.value = null;
  } catch (err: any) {
    importError.value =
      err.response?.data?.error ?? t("settings.importExport.importFailed");
  } finally {
    importing.value = false;
  }
}

async function saveCredentials() {
  credMsg.value = "";
  credError.value = "";
  if (!cred.currentPassword) {
    credError.value = t("settings.currentPassRequired");
    return;
  }
  credSaving.value = true;
  try {
    await authApi.changeCredentials(
      cred.currentPassword,
      cred.username || undefined,
      cred.newPassword || undefined,
    );
    credMsg.value = t("settings.credSaved");
    Object.assign(cred, { username: "", newPassword: "", currentPassword: "" });
  } catch (err: any) {
    credError.value = err.response?.data?.error ?? t("settings.credFailed");
  } finally {
    credSaving.value = false;
  }
}
</script>

<style scoped>
.event-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.event-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid #ddd;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  user-select: none;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}

.event-pill input[type="checkbox"] {
  display: none;
}

.event-pill.active {
  border-color: var(--color-primary, #2563eb);
  background: #eff6ff;
  color: var(--color-primary, #2563eb);
  font-weight: 500;
}

.event-pill:hover:not(.active) {
  border-color: #bbb;
  background: #fafafa;
}

.ie-divider {
  border: none;
  border-top: 1px solid #eee;
  margin: 16px 0;
}

.import-mode-row {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.import-mode-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.import-mode-option input[type="radio"] {
  margin-top: 3px;
  flex-shrink: 0;
}

.import-mode-label {
  font-size: 13px;
  font-weight: 500;
}

.import-mode-hint {
  font-size: 12px;
  color: #888;
}

.ua-preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ua-preset-name {
  flex: 0 0 140px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ua-preset-value {
  flex: 1;
  font-size: 11px;
  font-family: monospace;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ua-preset-del {
  flex-shrink: 0;
  color: #e63946;
  padding: 3px 7px;
}

.ua-preset-add {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* AI supplier cards */
.supplier-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #fafafa;
}
.supplier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.supplier-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}
.supplier-name {
  font-weight: 600;
  font-size: 13px;
}
.supplier-url {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
  word-break: break-all;
}
.supplier-timeout {
  font-size: 11px;
  color: #9ca3af;
}
.supplier-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.supplier-edit-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.supplier-no-key-warning {
  margin-top: 8px;
  font-size: 12px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 5px;
  padding: 5px 10px;
}
.supplier-models {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.supplier-models-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.supplier-model-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.model-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e5e7eb;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: monospace;
}
.model-chip-del {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9ca3af;
  font-size: 11px;
  line-height: 1;
}
.model-chip-del:hover { color: #ef4444; }
.model-add-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.form-input-sm {
  padding: 4px 8px;
  font-size: 12px;
  height: auto;
}
.btn-danger { color: #ef4444; }
.btn-danger:hover { color: #dc2626; }

.settings-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  align-items: start;
}
.s-col-4 { grid-column: span 4; }
.s-col-6 { grid-column: span 6; }
.s-col-12 { grid-column: span 12; }
@media (max-width: 960px) {
  .s-col-4 { grid-column: span 6; }
}
@media (max-width: 640px) {
  .s-col-4, .s-col-6 { grid-column: span 12; }
}
</style>
