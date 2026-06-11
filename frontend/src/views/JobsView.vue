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
            <tr v-if="!jobs.length">
              <td colspan="7" class="empty">{{ t('jobs.noJobs') }}</td>
            </tr>
            <tr v-for="j in jobs" :key="j.id">
              <td>{{ j.name }}</td>
              <td>{{ j.accountName ?? j.accountId }}</td>
              <td><span class="badge badge-blue">{{ t(`logs.jobType.${j.jobType}`) }}</span></td>
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
              <div v-if="btnDropdown === '{aiBtn}' && aiKeyMissing" style="font-size:11px;color:#e63946;margin-top:4px">{{ t('jobs.aiKeyWarning') }}</div>
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
import { jobsApi, accountsApi, statusApi, settingsApi, logsApi, type Job, type Account, type ScheduleStatus, type Settings, type EmbywatchConfig } from '../api/client';
import { t } from '../i18n';

const jobs = ref<Job[]>([]);
const accounts = ref<Account[]>([]);
const scheduleStatus = ref<ScheduleStatus[]>([]);
const settings = ref<Settings | null>(null);
const running = ref(new Set<number>());
const pollTimers = new Map<number, ReturnType<typeof setTimeout>>();

const showForm = ref(false);
const editTarget = ref<Job | null>(null);
const form = reactive({
  name: '',
  accountId: null as number | null,
  jobType: 'checkin' as 'checkin' | 'embywatch',
  botUsername: '',
  scheduleWindowStart: 1400,
  scheduleWindowEnd: 1600,
  timezone: 'Australia/Sydney',
  replyTimeoutMs: 40000,
  retryMax: 5,
  enabled: true,
});
const embyCfg = reactive<{ username: string; password: string; playDuration: number | string; userAgent: string }>({
  username: '',
  password: '',
  playDuration: '',
  userAgent: '',
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
const BTN_PRESETS = new Set(['', '签到', '{aiBtn}', '{anyBtn}'])
const cmdDropdown = ref('')
const cmdCustom = ref('')
const btnDropdown = ref('')
const btnCustom = ref('')

function setCmdState(val: string) {
  if (CMD_PRESETS.has(val)) { cmdDropdown.value = val; cmdCustom.value = ''; }
  else { cmdDropdown.value = 'custom'; cmdCustom.value = val; }
}
function setBtnState(val: string) {
  if (BTN_PRESETS.has(val)) { btnDropdown.value = val; btnCustom.value = ''; }
  else { btnDropdown.value = 'custom'; btnCustom.value = val; }
}

function onJobTypeChange() {
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '' });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  form.botUsername = '';
  form.accountId = form.jobType === 'checkin' ? (accounts.value[0]?.id ?? null) : null;
  setCmdState(''); setBtnState('');
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
  return new Date(iso).toLocaleString('en-AU', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '' });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
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
        });
      } catch { Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '' }); }
    } else {
      Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '' });
    }
  } else {
    Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '' });
    Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  }
  formError.value = '';
  showForm.value = true;
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

function buildConfig(): EmbywatchConfig | null {
  if (form.jobType !== 'embywatch') return null;
  const cfg: EmbywatchConfig = { username: embyCfg.username, password: embyCfg.password };
  if (embyCfg.playDuration !== '') cfg.playDuration = Number(embyCfg.playDuration as string | number);
  if (embyCfg.userAgent) cfg.userAgent = embyCfg.userAgent;
  return cfg;
}

async function saveJob() {
  formError.value = '';
  if (!form.name) { formError.value = t('jobs.errors.nameRequired'); return; }
  if (form.jobType === 'checkin' && !form.accountId) { formError.value = t('jobs.errors.accountRequired'); return; }
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
    const checkinButton = (btnDropdown.value === 'custom' ? btnCustom.value : btnDropdown.value) || undefined;
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
