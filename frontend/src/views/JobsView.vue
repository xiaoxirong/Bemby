<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t('jobs.title') }}</h2>
      <button class="btn btn-primary" @click="openAdd">{{ t('jobs.addBtn') }}</button>
    </div>

    <!-- Scheduler status -->
    <div v-if="scheduleStatus.length" class="card" style="margin-bottom:16px;padding:14px 18px">
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:8px">
        {{ t('jobs.nextRuns') }}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        <div v-for="s in scheduleStatus" :key="s.jobId" style="font-size:13px">
          <strong>{{ s.jobName }}</strong>: {{ fmtDateTime(s.nextRun) }}
        </div>
      </div>
    </div>

    <div class="card">
      <!-- Filters -->
      <div style="padding:12px 16px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button
          v-for="opt in filterOptions" :key="opt.value"
          class="btn btn-sm"
          :class="filterType === opt.value ? 'btn-primary' : 'btn-ghost'"
          @click="filterType = opt.value"
        >{{ opt.label }}</button>
        <select v-if="accounts.length > 1" v-model="filterAccountId" class="form-select" style="width:160px;height:30px;font-size:13px;padding:0 8px">
          <option value="">{{ t('jobs.allAccounts') }}</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <select v-if="botUrlOptions.length > 1" v-model="filterBotUrl" class="form-select" style="width:180px;height:30px;font-size:13px;padding:0 8px">
          <option value="">{{ t('jobs.allBotUrls') }}</option>
          <option v-for="b in botUrlOptions" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('jobs.colAccount') }}</th>
              <th>{{ t('jobs.colType') }}</th>
              <th>{{ t('jobs.colBotUrl') }}</th>
              <th>{{ t('jobs.colWindow') }}</th>
              <th>{{ t('jobs.colEnabled') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredJobs.length">
              <td colspan="7" class="empty">{{ t('jobs.noJobs') }}</td>
            </tr>
            <tr v-for="j in filteredJobs" :key="j.id">
              <td>{{ j.name }}</td>
              <td>{{ j.accountName ?? j.accountId }}</td>
              <td><span :class="jobTypeBadge(j.jobType)">{{ t(`logs.jobType.${j.jobType}`) }}</span></td>
              <td>{{ j.jobType === 'embywatch' ? j.botUsername : '@' + j.botUsername }}</td>
              <td>{{ fmtWindow(j.scheduleWindowStart, j.scheduleWindowEnd) }}</td>
              <td>
                <span
                  :class="j.enabled ? 'badge badge-green' : 'badge badge-grey'"
                  style="cursor:pointer;user-select:none"
                  @click="toggleEnabled(j)"
                >
                  {{ j.enabled ? t('common.yes') : t('common.no') }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-sm btn-success" :disabled="running.has(j.id)" @click="runNow(j.id)">
                    {{ running.has(j.id) ? t('common.runBusy') : t('common.run') }}
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="openEdit(j)">{{ t('common.edit') }}</button>
                  <button class="btn btn-sm btn-ghost" @click="openDuplicate(j)">{{ t('common.duplicate') }}</button>
                  <button class="btn btn-sm btn-danger" @click="remove(j.id)">{{ t('common.delete') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <div v-if="showForm" class="modal-backdrop">
      <div class="modal" style="width:560px">
        <h3 class="modal-title">{{ t(editTarget ? 'jobs.editTitle' : 'jobs.addTitle') }}</h3>
        <div class="modal-body">
        <div v-if="formError" class="error-msg">{{ formError }}</div>

        <!-- Enabled -->
        <div style="margin-bottom:14px">
          <label class="form-check">
            <input v-model="form.enabled" type="checkbox" />
            <span>{{ t('jobs.labelEnabled') }}</span>
          </label>
        </div>

        <!-- Job Name + Job Type -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelName') }} <span style="color:#e63946">*</span></label>
            <input v-model.trim="form.name" class="form-input" placeholder="Xxemby" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelType') }}</label>
            <select v-model="form.jobType" class="form-select" @change="onJobTypeChange">
              <option value="checkin">Check-in (签到)</option>
              <option value="embywatch">Emby Watch (观看)</option>
              <option value="custom">Custom (自定义)</option>
            </select>
          </div>
        </div>

        <!-- Check-in: Account + Bot Username -->
        <div v-if="form.jobType === 'checkin'" class="form-row">
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelAccount') }} <span style="color:#e63946">*</span></label>
            <select v-model="form.accountId" class="form-select">
              <option :value="null" disabled>{{ t('jobs.selectAccount') }}</option>
              <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelBot') }} <span style="color:#e63946">*</span></label>
            <input v-model.trim="form.botUsername" class="form-input" placeholder="SomeBotUsername" />
          </div>
        </div>

        <!-- Emby Watch: Server URL (protocol + host + port) -->
        <div v-if="form.jobType === 'embywatch'" class="form-group">
          <label class="form-label">{{ t('jobs.labelServerUrl') }} <span style="color:#e63946">*</span></label>
          <div style="display:flex;align-items:center;gap:6px">
            <select v-model="embyServer.protocol" class="form-select" style="width:88px;flex-shrink:0">
              <option value="https">https</option>
              <option value="http">http</option>
            </select>
            <span style="color:#aaa;font-size:13px;flex-shrink:0">://</span>
            <input v-model.trim="embyServer.host" class="form-input" placeholder="emby.xxxx.com" @paste="handleEmbyHostPaste" />
            <span style="color:#aaa;font-size:13px;flex-shrink:0">:</span>
            <input v-model.number="embyServer.port" class="form-input" type="number" min="1" max="65535" style="width:72px;flex-shrink:0" placeholder="443" />
          </div>
        </div>

        <!-- embywatch-specific fields -->
        <template v-if="form.jobType === 'embywatch'">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelEmbyUser') }} <span style="color:#e63946">*</span></label>
              <input v-model.trim="embyCfg.username" class="form-input" placeholder="Username" autocomplete="off" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelEmbyPass') }} <span style="color:#e63946">*</span></label>
              <input v-model="embyCfg.password" class="form-input" type="password" placeholder="Password" autocomplete="new-password" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                {{ t('jobs.labelPlayDuration') }}
                <span style="color:#aaa;font-weight:400"> — {{ t('common.blankForDefault') }}</span>
              </label>
              <input v-model.number="embyCfg.playDuration" class="form-input" type="number" min="30" placeholder="300" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              {{ t('jobs.labelUserAgent') }}
              <span style="color:#aaa;font-weight:400"> — {{ t('common.blankForDefault') }}</span>
            </label>
            <textarea v-model.trim="embyCfg.userAgent" class="form-input" rows="3" placeholder="Leave blank for default" style="resize:vertical" />
          </div>
          <div class="emby-rules-hint">{{ t('jobs.playbackRulesHint') }}</div>
          <div class="form-group" style="margin-top:4px">
            <label class="form-check">
              <input v-model="embyCfg.markWatched" type="checkbox" />
              <span>{{ t('jobs.labelMarkWatched') }}</span>
            </label>
            <div style="font-size:11px;color:#aaa;margin-top:4px;padding-left:24px">{{ t('jobs.markWatchedHint') }}</div>
          </div>
        </template>

        <!-- Custom: account + target bot -->
        <template v-if="form.jobType === 'custom'">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelAccount') }} <span style="color:#e63946">*</span></label>
              <select v-model="form.accountId" class="form-select">
                <option :value="null" disabled>{{ t('jobs.selectAccount') }}</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('jobs.custom.labelTarget') }} <span style="color:#e63946">*</span></label>
              <input v-model.trim="form.botUsername" class="form-input" placeholder="BotUsername" />
            </div>
          </div>

          <!-- Action chain builder -->
          <div class="form-group">
            <label class="form-label">{{ t('jobs.custom.actions') }}</label>

            <div v-if="customActions.length === 0" style="font-size:13px;color:#aaa;padding:10px 0">
              {{ t('jobs.custom.noActions') }}
            </div>

            <div v-for="(action, i) in customActions" :key="i" class="custom-action-card">
              <!-- Row: step number + type selector + move/delete buttons -->
              <div class="custom-action-header">
                <span class="custom-action-num">{{ i + 1 }}</span>
                <select v-model="action.type" class="form-select custom-action-type-select">
                  <option value="send_command">{{ t('jobs.custom.actionSendCommand') }}</option>
                  <option value="wait_reply">{{ t('jobs.custom.actionWaitReply') }}</option>
                  <option value="delay">{{ t('jobs.custom.actionDelay') }}</option>
                  <option value="click_button">{{ t('jobs.custom.actionClickButton') }}</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" @click="moveUp(i)">↑</button>
                <button type="button" class="btn btn-ghost btn-sm" :disabled="i === customActions.length - 1" @click="moveDown(i)">↓</button>
                <button type="button" class="btn btn-danger btn-sm" @click="removeAction(i)">×</button>
              </div>

              <!-- send_command -->
              <div v-if="action.type === 'send_command'" class="custom-action-params">
                <label class="form-label">{{ t('jobs.custom.labelContent') }}</label>
                <select v-model="action.contentDropdown" class="form-select">
                  <option value="/start">/start</option>
                  <option value="/checkin">/checkin</option>
                  <option value="custom">{{ t('common.custom') }}...</option>
                </select>
                <input v-if="action.contentDropdown === 'custom'" v-model="action.contentCustom" class="form-input" style="margin-top:6px" placeholder="/mycommand" />
                <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.contentHint') }}</div>
              </div>

              <!-- wait_reply -->
              <div v-if="action.type === 'wait_reply'" class="custom-action-params">
                <label class="form-label">{{ t('jobs.custom.labelMaxWait') }}</label>
                <input v-model.number="action.maxWaitMs" class="form-input" type="number" min="1000" step="1000" />
              </div>

              <!-- delay -->
              <div v-if="action.type === 'delay'" class="custom-action-params">
                <label class="form-label">{{ t('jobs.custom.labelWaitMs') }}</label>
                <input v-model.number="action.waitMs" class="form-input" type="number" min="100" step="500" />
              </div>

              <!-- click_button -->
              <div v-if="action.type === 'click_button'" class="custom-action-params">
                <div class="form-row" style="margin-bottom:0">
                  <div class="form-group">
                    <label class="form-label">{{ t('jobs.custom.labelButton') }}</label>
                    <select v-model="action.buttonDropdown" class="form-select">
                      <option value="签到">签到</option>
                      <option value="{aiBtn}" :disabled="aiKeyMissing">{{ t('jobs.aiBtnOption') }}{{ aiKeyMissing ? ' (' + t('jobs.noApiKey') + ')' : '' }}</option>
                      <option value="{anyBtn}">{{ t('jobs.anyBtnOption') }}</option>
                      <option value="custom">{{ t('common.custom') }}...</option>
                    </select>
                    <input v-if="action.buttonDropdown === 'custom'" v-model="action.buttonCustom" class="form-input" style="margin-top:6px" placeholder="Custom button text" />
                    <template v-if="action.buttonDropdown === '{aiBtn}'">
                      <input v-model.trim="action.buttonAiHint" class="form-input" style="margin-top:6px" :placeholder="t('jobs.aiHintPlaceholder')" />
                      <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.aiHintHint') }}</div>
                      <div v-if="aiKeyMissing" style="font-size:11px;color:#e63946;margin-top:4px">{{ t('jobs.aiKeyWarning') }}</div>
                    </template>
                    <div v-else style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.buttonHint') }}</div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ t('jobs.custom.labelMaxRetries') }}</label>
                    <input v-model.number="action.maxRetries" class="form-input" type="number" min="0" max="10" />
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label">{{ t('jobs.custom.labelMaxWait') }}</label>
                  <input v-model.number="action.maxWaitMs" class="form-input" type="number" min="1000" step="1000" />
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" @click="addAction">
              {{ t('jobs.custom.addAction') }}
            </button>
          </div>
        </template>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelWindowStart') }}</label>
            <input v-model.number="form.scheduleWindowStart" class="form-input" type="number" placeholder="1400" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelWindowEnd') }}</label>
            <input v-model.number="form.scheduleWindowEnd" class="form-input" type="number" placeholder="1600" />
          </div>
        </div>

        <!-- checkin-specific fields -->
        <template v-if="form.jobType === 'checkin'">
          <div class="form-row" style="align-items:start">
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelStartCommand') }}</label>
              <select v-model="cmdDropdown" class="form-select">
                <option value="">({{ t('common.default') }}: /start)</option>
                <option value="/start">/start</option>
                <option value="/checkin">/checkin</option>
                <option value="custom">{{ t('common.custom') }}...</option>
              </select>
              <input v-if="cmdDropdown === 'custom'" v-model.trim="cmdCustom" class="form-input" style="margin-top:6px" placeholder="/mycommand" />
              <div style="font-size:11px;color:#aaa;margin-top:4px">{{ t('jobs.startCommandHint') }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelCheckinButton') }}</label>
              <select v-model="btnDropdown" class="form-select">
                <option value="">({{ t('common.default') }}: 签到)</option>
                <option value="签到">签到</option>
                <option value="{aiBtn}" :disabled="aiKeyMissing">{{ t('jobs.aiBtnOption') }}{{ aiKeyMissing ? ' (' + t('jobs.noApiKey') + ')' : '' }}</option>
                <option value="{anyBtn}">{{ t('jobs.anyBtnOption') }}</option>
                <option value="custom">{{ t('common.custom') }}...</option>
              </select>
              <input v-if="btnDropdown === 'custom'" v-model.trim="btnCustom" class="form-input" style="margin-top:6px" placeholder="Custom button text" />
              <template v-if="btnDropdown === '{aiBtn}'">
                <input v-model.trim="btnAiHint" class="form-input" style="margin-top:6px" :placeholder="t('jobs.aiHintPlaceholder')" />
                <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.aiHintHint') }}</div>
                <div v-if="aiKeyMissing" style="font-size:11px;color:#e63946;margin-top:4px">{{ t('jobs.aiKeyWarning') }}</div>
              </template>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelReplyTimeout') }}</label>
              <input v-model.number="form.replyTimeoutMs" class="form-input" type="number" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('jobs.labelMaxRetries') }}</label>
              <input v-model.number="form.retryMax" class="form-input" type="number" min="1" max="10" />
            </div>
          </div>
        </template>

        <div v-if="form.jobType === 'embywatch'" class="form-row">
          <div class="form-group">
            <label class="form-label">{{ t('jobs.labelMaxRetries') }}</label>
            <input v-model.number="form.retryMax" class="form-input" type="number" min="1" max="10" />
          </div>
        </div>

        </div><!-- end modal-body -->
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showForm = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveJob">
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { jobsApi, accountsApi, statusApi, settingsApi, logsApi, type Job, type Account, type ScheduleStatus, type Settings, type EmbywatchConfig, type CustomConfig } from '../api/client';
import { t, locale } from '../i18n';

type CustomActionForm = {
  type: 'send_command' | 'wait_reply' | 'delay' | 'click_button';
  content: string;
  contentDropdown: string;
  contentCustom: string;
  maxWaitMs: number;
  waitMs: number;
  button: string;
  buttonDropdown: string;
  buttonCustom: string;
  buttonAiHint: string;
  maxRetries: number;
};

const jobs = ref<Job[]>([]);
const accounts = ref<Account[]>([]);
const scheduleStatus = ref<ScheduleStatus[]>([]);
const settings = ref<Settings | null>(null);
const running = ref(new Set<number>());

const filterType = ref('');
const filterAccountId = ref<number | ''>('');
const filterBotUrl = ref('');
const filterOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'checkin', label: t('logs.jobType.checkin') },
  { value: 'embywatch', label: t('logs.jobType.embywatch') },
  { value: 'custom', label: t('logs.jobType.custom') },
]);
const botUrlOptions = computed(() => {
  const vals = [...new Set(jobs.value.map(j => j.botUsername).filter(Boolean))];
  return vals.sort();
});
const filteredJobs = computed(() =>
  jobs.value.filter(j =>
    (!filterType.value || j.jobType === filterType.value) &&
    (filterAccountId.value === '' || j.accountId === filterAccountId.value) &&
    (!filterBotUrl.value || j.botUsername === filterBotUrl.value),
  ),
);

function jobTypeBadge(type: string) {
  const map: Record<string, string> = {
    checkin: 'badge badge-blue',
    embywatch: 'badge badge-purple',
    custom: 'badge badge-amber',
  };
  return map[type] ?? 'badge badge-grey';
}
const pollTimers = new Map<number, ReturnType<typeof setTimeout>>();

const showForm = ref(false);
const editTarget = ref<Job | null>(null);
const customActions = ref<CustomActionForm[]>([]);

const form = reactive({
  name: '',
  accountId: null as number | null,
  jobType: 'checkin' as 'checkin' | 'embywatch' | 'custom',
  botUsername: '',
  scheduleWindowStart: 1400,
  scheduleWindowEnd: 1600,
  timezone: 'Australia/Sydney',
  replyTimeoutMs: 40000,
  retryMax: 5,
  enabled: true,
});
const embyCfg = reactive<{ username: string; password: string; playDuration: number | string; userAgent: string; markWatched: boolean }>({
  username: '',
  password: '',
  playDuration: '',
  userAgent: '',
  markWatched: true,
});
const embyServer = reactive<{ protocol: 'https' | 'http'; host: string; port: number | '' }>({
  protocol: 'https',
  host: '',
  port: 443,
});
const formError = ref('');
const saving = ref(false);
const aiKeyMissing = computed(() => !settings.value?.ai_api_key);

const CMD_PRESETS = new Set(['', '/start', '/checkin'])
const ACTION_CMD_PRESETS = new Set(['/start', '/checkin'])
const ACTION_BTN_PRESETS = new Set(['签到', '{anyBtn}'])
const BTN_PRESETS = new Set(['', '签到', '{aiBtn}', '{anyBtn}'])
const cmdDropdown = ref('')
const cmdCustom = ref('')
const btnDropdown = ref('')
const btnCustom = ref('')
const btnAiHint = ref('')

function setCmdState(val: string) {
  if (CMD_PRESETS.has(val)) { cmdDropdown.value = val; cmdCustom.value = ''; }
  else { cmdDropdown.value = 'custom'; cmdCustom.value = val; }
}
function setBtnState(val: string) {
  const aiMatch = val.match(/^\{aiBtn:(.+)\}$/);
  if (aiMatch) {
    btnDropdown.value = '{aiBtn}'; btnAiHint.value = aiMatch[1].trim(); btnCustom.value = '';
  } else if (BTN_PRESETS.has(val)) {
    btnDropdown.value = val; btnCustom.value = ''; btnAiHint.value = '';
  } else {
    btnDropdown.value = 'custom'; btnCustom.value = val; btnAiHint.value = '';
  }
}

function onJobTypeChange() {
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  form.botUsername = '';
  form.accountId = (form.jobType === 'checkin' || form.jobType === 'custom')
    ? (accounts.value[0]?.id ?? null)
    : null;
  customActions.value = [];
  btnAiHint.value = '';
  setCmdState(''); setBtnState('');
}

function defaultAction(): CustomActionForm {
  return { type: 'send_command', content: '/start', contentDropdown: '/start', contentCustom: '', maxWaitMs: 30000, waitMs: 2000, button: '签到', buttonDropdown: '签到', buttonCustom: '', buttonAiHint: '', maxRetries: 3 };
}

function addAction() {
  customActions.value.push(defaultAction());
}

function removeAction(i: number) {
  customActions.value.splice(i, 1);
}

function moveUp(i: number) {
  if (i === 0) return;
  const arr = customActions.value;
  [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
}

function moveDown(i: number) {
  const arr = customActions.value;
  if (i >= arr.length - 1) return;
  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
}

onMounted(async () => {
  await Promise.all([loadJobs(), loadAccounts(), loadStatus(), loadSettings()]);
});

async function loadSettings() {
  try { settings.value = await settingsApi.get(); } catch { /* ignore */ }
}

async function loadJobs() {
  jobs.value = await jobsApi.list();
}

async function loadAccounts() {
  accounts.value = await accountsApi.list();
}

async function loadStatus() {
  try { scheduleStatus.value = await statusApi.get(); } catch { /* ignore */ }
}

function fmtWindow(start: number, end: number) {
  const fmt = (n: number) => `${String(Math.floor(n / 100)).padStart(2, '0')}:${String(n % 100).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function fmtDateTime(iso: string) {
  const localeMap: Record<string, string> = { en: 'en-AU', zh: 'zh-CN' };
  return new Date(iso).toLocaleString(localeMap[locale.value] ?? 'en-AU', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function openAdd() {
  editTarget.value = null;
  Object.assign(form, {
    name: '', accountId: accounts.value[0]?.id ?? null,
    jobType: 'checkin', botUsername: '',
    scheduleWindowStart: 1400, scheduleWindowEnd: 1600,
    timezone: settings.value?.default_timezone ?? 'Australia/Sydney',
    replyTimeoutMs: 40000,
    retryMax: Number(settings.value?.default_max_retry ?? 5),
    enabled: true,
  });
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  customActions.value = [];
  setCmdState(''); setBtnState('');
  formError.value = '';
  showForm.value = true;
}

function openEdit(j: Job) {
  editTarget.value = j;
  Object.assign(form, {
    name: j.name, accountId: j.accountId, jobType: j.jobType,
    botUsername: j.botUsername, scheduleWindowStart: j.scheduleWindowStart,
    scheduleWindowEnd: j.scheduleWindowEnd, timezone: j.timezone,
    replyTimeoutMs: j.replyTimeoutMs, retryMax: j.retryMax, enabled: j.enabled,
  });
  setCmdState(j.startCommand === '/start' ? '' : (j.startCommand ?? ''));
  setBtnState(j.checkinButton === '签到' ? '' : (j.checkinButton ?? ''));
  if (j.jobType === 'embywatch') {
    // Parse stored URL back into protocol / host / port fields
    const m = j.botUsername.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
    Object.assign(embyServer, {
      protocol: (m?.[1] ?? 'https') as 'https' | 'http',
      host: m?.[2] ?? j.botUsername,
      port: m?.[3] ? Number(m[3]) : 443,
    });
    if (j.config) {
      try {
        let c = JSON.parse(j.config) as EmbywatchConfig | string;
        // Migrate legacy double-encoded records
        if (typeof c === 'string') c = JSON.parse(c) as EmbywatchConfig;
        Object.assign(embyCfg, {
          username: c.username ?? '',
          password: c.password ?? '',
          playDuration: c.playDuration ?? '',
          userAgent: c.userAgent ?? '',
          markWatched: c.markWatched !== false,
        });
      } catch { Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true }); }
    } else {
      Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
    }
  } else if (j.jobType === 'custom') {
    Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
    Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
    if (j.config) {
      try {
        const cfg = JSON.parse(j.config) as CustomConfig;
        customActions.value = cfg.actions.map(a => {
          const base = defaultAction();
          if (a.type === 'send_command') {
            const contentDropdown = ACTION_CMD_PRESETS.has(a.content) ? a.content : 'custom';
            return { ...base, type: 'send_command', content: a.content, contentDropdown, contentCustom: contentDropdown === 'custom' ? a.content : '' };
          }
          if (a.type === 'wait_reply') return { ...base, type: 'wait_reply', maxWaitMs: a.maxWaitMs };
          if (a.type === 'delay') return { ...base, type: 'delay', waitMs: a.waitMs };
          if (a.type === 'click_button') {
            const aiMatch = a.button.match(/^\{aiBtn(?::(.+))?\}$/);
            let buttonDropdown: string, buttonCustom = '', buttonAiHint = '';
            if (aiMatch) {
              buttonDropdown = '{aiBtn}'; buttonAiHint = aiMatch[1]?.trim() ?? '';
            } else if (ACTION_BTN_PRESETS.has(a.button)) {
              buttonDropdown = a.button;
            } else {
              buttonDropdown = 'custom'; buttonCustom = a.button;
            }
            return { ...base, type: 'click_button', button: a.button, buttonDropdown, buttonCustom, buttonAiHint, maxRetries: a.maxRetries, maxWaitMs: a.maxWaitMs };
          }
          return base;
        });
      } catch { customActions.value = []; }
    } else {
      customActions.value = [];
    }
  } else {
    Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
    Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
    customActions.value = [];
  }
  formError.value = '';
  showForm.value = true;
}

function openDuplicate(j: Job) {
  openEdit(j);
  editTarget.value = null;
  form.name = `${j.name} (copy)`;
}

function handleEmbyHostPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')?.trim();
  if (!text) return;
  // Match optional protocol, host, optional port, optional path
  const match = text.match(/^(?:(https?):\/\/)?([^:/\s]+)(?::(\d+))?(?:\/.*)?$/i);
  if (!match) return;
  const [, proto, host, portStr] = match;
  // Plain hostname with no protocol or port — nothing to split, paste normally
  if (!proto && !portStr) return;
  event.preventDefault();
  if (proto === 'https' || proto === 'http') embyServer.protocol = proto as 'https' | 'http';
  embyServer.host = host;
  if (portStr) embyServer.port = Number(portStr);
}

function buildConfig(): EmbywatchConfig | CustomConfig | null {
  if (form.jobType === 'embywatch') {
    const cfg: EmbywatchConfig = { username: embyCfg.username, password: embyCfg.password };
    if (embyCfg.playDuration !== '') cfg.playDuration = Number(embyCfg.playDuration as string | number);
    if (embyCfg.userAgent) cfg.userAgent = embyCfg.userAgent;
    cfg.markWatched = embyCfg.markWatched;
    return cfg;
  }
  if (form.jobType === 'custom') {
    return {
      actions: customActions.value.map(a => {
        if (a.type === 'send_command') {
          const content = a.contentDropdown === 'custom' ? a.contentCustom : a.contentDropdown;
          return { type: 'send_command' as const, content };
        }
        if (a.type === 'wait_reply') return { type: 'wait_reply' as const, maxWaitMs: a.maxWaitMs };
        if (a.type === 'delay') return { type: 'delay' as const, waitMs: a.waitMs };
        let button: string;
        if (a.buttonDropdown === 'custom') button = a.buttonCustom;
        else if (a.buttonDropdown === '{aiBtn}') button = a.buttonAiHint.trim() ? `{aiBtn:${a.buttonAiHint.trim()}}` : '{aiBtn}';
        else button = a.buttonDropdown || '签到';
        return { type: 'click_button' as const, button, maxRetries: a.maxRetries, maxWaitMs: a.maxWaitMs };
      }),
    };
  }
  return null;
}

async function saveJob() {
  formError.value = '';
  if (!form.name) { formError.value = t('jobs.errors.nameRequired'); return; }
  if ((form.jobType === 'checkin' || form.jobType === 'custom') && !form.accountId) { formError.value = t('jobs.errors.accountRequired'); return; }
  if (form.jobType === 'custom') {
    if (!form.botUsername) { formError.value = t('jobs.errors.botRequired'); return; }
    if (customActions.value.length === 0) { formError.value = t('jobs.errors.customActionsRequired'); return; }
  }
  if (form.jobType === 'embywatch') {
    if (!embyServer.host) { formError.value = t('jobs.errors.hostRequired'); return; }
    const portPart = (embyServer.port as number | string) !== '' ? `:${embyServer.port}` : '';
    // Strip any accidental protocol prefix the user may have typed into the host field
    form.botUsername = `${embyServer.protocol}://${embyServer.host.replace(/^https?:\/\//, '')}${portPart}`;
  }
  if (!form.botUsername) { formError.value = t('jobs.errors.botRequired'); return; }
  if (form.jobType === 'checkin') form.botUsername = form.botUsername.replace(/^@+/, '');
  if (form.jobType === 'embywatch' && (!embyCfg.username || !embyCfg.password)) {
    formError.value = t('jobs.errors.embyCredRequired');
    return;
  }
  saving.value = true;
  try {
    const rawCfg = buildConfig();
    const startCommand = (cmdDropdown.value === 'custom' ? cmdCustom.value : cmdDropdown.value) || undefined;
    const resolvedAiBtn = btnAiHint.value.trim() ? `{aiBtn:${btnAiHint.value.trim()}}` : '{aiBtn}';
    const checkinButton = btnDropdown.value === '{aiBtn}'
      ? resolvedAiBtn
      : (btnDropdown.value === 'custom' ? btnCustom.value : btnDropdown.value) || undefined;
    const payload = {
      ...form,
      config: rawCfg ?? null,
      startCommand,
      checkinButton,
    };
    if (editTarget.value) {
      await jobsApi.update(editTarget.value.id, payload);
    } else {
      await jobsApi.create(payload);
    }
    showForm.value = false;
    await Promise.all([loadJobs(), loadStatus()]);
  } catch (err: any) {
    formError.value = err.response?.data?.error ?? t('common.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(j: Job) {
  if (j.enabled && !confirm(t('jobs.confirmDisable'))) return;
  await jobsApi.update(j.id, { enabled: !j.enabled });
  await Promise.all([loadJobs(), loadStatus()]);
}

async function remove(id: number) {
  if (!confirm(t('jobs.confirmDelete'))) return;
  await jobsApi.delete(id);
  await loadJobs();
}

function stopRunning(jobId: number) {
  running.value.delete(jobId);
  running.value = new Set(running.value);
  const timer = pollTimers.get(jobId);
  if (timer) { clearTimeout(timer); pollTimers.delete(jobId); }
}

function schedulePoll(jobId: number, logId: number) {
  const timer = setTimeout(async () => {
    try {
      const log = await logsApi.getOne(logId);
      if (log.status === 'running') {
        schedulePoll(jobId, logId);
      } else {
        stopRunning(jobId);
      }
    } catch {
      stopRunning(jobId);
    }
  }, 3000);
  pollTimers.set(jobId, timer);
}

async function runNow(id: number) {
  running.value.add(id);
  running.value = new Set(running.value);
  try {
    const { logId } = await jobsApi.run(id);
    schedulePoll(id, logId);
  } catch (err: any) {
    alert(err.response?.data?.error ?? 'Trigger failed');
    stopRunning(id);
  }
}

onUnmounted(() => {
  for (const timer of pollTimers.values()) clearTimeout(timer);
});
</script>

<style scoped>
.custom-action-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fafafa;
}

.custom-action-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.custom-action-num {
  min-width: 20px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
}

.custom-action-type-select {
  flex: 1;
}

.custom-action-params {
  padding-left: 26px;
}
</style>
