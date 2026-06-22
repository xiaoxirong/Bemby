<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t('templates.title') }}</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" @click="openImport"><i class="fa-solid fa-file-import"></i> {{ t('templates.importBtn') }}</button>
        <button class="btn btn-primary" @click="openAdd"><i class="fa-solid fa-plus"></i> {{ t('templates.addBtn') }}</button>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('templates.colType') }}</th>
              <th class="col-hide-mobile">{{ t('templates.colBotUrl') }}</th>
              <th class="col-hide-mobile">{{ t('templates.colLinkedJobs') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!templates.length">
              <td colspan="5" class="empty">{{ t('templates.noTemplates') }}</td>
            </tr>
            <tr v-for="tpl in templates" :key="tpl.id">
              <td>{{ tpl.name }}</td>
              <td><span :class="jobTypeBadge(tpl.jobType)">{{ t(`logs.jobType.${tpl.jobType}`) }}</span></td>
              <td class="col-hide-mobile">{{ tpl.jobType === 'embywatch' ? tpl.botUsername : '@' + tpl.botUsername }}</td>
              <td class="col-hide-mobile">{{ tpl.linkedJobCount ?? 0 }}</td>
              <td>
                <div class="actions hide-mobile">
                  <button class="btn btn-sm btn-ghost btn-icon" :title="copiedTplId === tpl.id ? t('templates.shareCopied') : t('templates.shareBtn')" @click="shareTemplate(tpl)">
                    <i :class="copiedTplId === tpl.id ? 'fa-solid fa-check' : 'fa-solid fa-share-nodes'"></i>
                  </button>
                  <button class="btn btn-sm btn-ghost btn-icon" :title="t('common.edit')" @click="openEdit(tpl)"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn btn-sm btn-danger btn-icon" :title="t('common.delete')" @click="remove(tpl.id)"><i class="fa-solid fa-trash"></i></button>
                </div>
                <button class="btn btn-sm btn-ghost btn-icon show-mobile" @click="actionMenuTpl = tpl">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <div v-if="showForm" class="modal-backdrop">
      <div class="modal" style="width:560px">
        <h3 class="modal-title">{{ t(editTarget ? 'templates.editTitle' : 'templates.addTitle') }}</h3>
        <div class="modal-body">
          <div v-if="formError" class="error-msg">{{ formError }}</div>

          <!-- Template Name + Job Type -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('templates.labelName') }} <span style="color:#e63946">*</span></label>
              <input v-model.trim="form.name" class="form-input" placeholder="My Template" />
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

          <!-- Check-in: Bot Username -->
          <div v-if="form.jobType === 'checkin'" class="form-group">
            <label class="form-label">{{ t('jobs.labelBot') }} <span style="color:#e63946">*</span></label>
            <input v-model.trim="form.botUsername" class="form-input" placeholder="SomeBotUsername" />
          </div>

          <!-- Emby Watch: Server URL -->
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
              <label class="form-label">{{ t('jobs.labelUserAgent') }}</label>
              <select v-model="embyUaDropdown" class="form-select" @change="onUaDropdownChange">
                <option value="">{{ t('jobs.uaDefault') }}</option>
                <option v-for="p in uaPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
                <option value="__custom__">{{ t('jobs.uaCustom') }}</option>
              </select>
              <textarea
                v-if="embyUaDropdown === '__custom__'"
                v-model.trim="embyCfg.userAgent"
                class="form-input"
                rows="2"
                style="margin-top:6px;resize:vertical"
                placeholder="Mozilla/5.0 ..."
              />
            </div>
            <div class="emby-rules-hint">{{ t('jobs.playbackRulesHint') }}</div>
            <div class="form-group" style="margin-top:4px">
              <label class="form-check">
                <input v-model="embyCfg.markWatched" type="checkbox" />
                <span>{{ t('jobs.labelMarkWatched') }}</span>
              </label>
              <div style="font-size:11px;color:#aaa;margin-top:4px;padding-left:24px">{{ t('jobs.markWatchedHint') }}</div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ t('jobs.labelMaxRetries') }}</label>
                <input v-model.number="form.retryMax" class="form-input" type="number" min="1" max="10" />
              </div>
            </div>
          </template>

          <!-- Custom: target bot + action chain -->
          <template v-if="form.jobType === 'custom'">
            <div class="form-group">
              <label class="form-label">{{ t('jobs.custom.labelTarget') }} <span style="color:#e63946">*</span></label>
              <input v-model.trim="form.botUsername" class="form-input" placeholder="BotUsername" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('jobs.custom.labelJobMaxRetries') }}</label>
              <input v-model.number="customJobMaxRetries" class="form-input" type="number" min="1" max="20" style="max-width:120px" />
              <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.jobMaxRetriesHint') }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('jobs.custom.actions') }}</label>
              <div v-if="customActions.length === 0" style="font-size:13px;color:#aaa;padding:10px 0">{{ t('jobs.custom.noActions') }}</div>
              <div v-for="(action, i) in customActions" :key="i" class="custom-action-card">
                <div class="custom-action-header">
                  <span class="custom-action-num">{{ i + 1 }}</span>
                  <select v-model="action.type" class="form-select custom-action-type-select">
                    <option value="send_command">{{ t('jobs.custom.actionSendCommand') }}</option>
                    <option value="wait_reply">{{ t('jobs.custom.actionWaitReply') }}</option>
                    <option value="delay">{{ t('jobs.custom.actionDelay') }}</option>
                    <option value="click_button">{{ t('jobs.custom.actionClickButton') }}</option>
                    <option value="enter_captcha" :disabled="aiKeyMissing">{{ t('jobs.custom.actionEnterCaptcha') }}{{ aiKeyMissing ? ' (' + t('jobs.noApiKey') + ')' : '' }}</option>
                  </select>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" :disabled="i === 0" @click="moveUp(i)"><i class="fa-solid fa-arrow-up"></i></button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" :disabled="i === customActions.length - 1" @click="moveDown(i)"><i class="fa-solid fa-arrow-down"></i></button>
                  <button type="button" class="btn btn-danger btn-sm btn-icon" @click="removeAction(i)"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <!-- send_command -->
                <div v-if="action.type === 'send_command'" class="custom-action-params">
                  <div class="form-row" style="margin-bottom:0">
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelContent') }}</label>
                      <select v-model="action.contentDropdown" class="form-select">
                        <option value="/start">/start</option>
                        <option value="/checkin">/checkin</option>
                        <option value="{aiInput}" :disabled="aiKeyMissing">{{ t('jobs.aiInputOption') }}{{ aiKeyMissing ? ' (' + t('jobs.noApiKey') + ')' : '' }}</option>
                        <option value="custom">{{ t('common.custom') }}...</option>
                      </select>
                      <input v-if="action.contentDropdown === 'custom'" v-model="action.contentCustom" class="form-input" style="margin-top:6px" placeholder="/mycommand" />
                      <template v-if="action.contentDropdown === '{aiInput}'">
                        <input v-model.trim="action.contentAiInputLength" class="form-input" style="margin-top:6px" type="number" min="1" max="20" :placeholder="t('jobs.aiInputLengthPlaceholder')" />
                        <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.aiInputLengthHint') }}</div>
                        <div v-if="aiKeyMissing" style="font-size:11px;color:#e63946;margin-top:4px">{{ t('jobs.aiKeyWarning') }}</div>
                      </template>
                      <div v-else style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.contentHint') }}</div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelMaxRetries') }}</label>
                      <input v-model.number="action.maxRetries" class="form-input" type="number" min="0" max="10" />
                    </div>
                  </div>
                </div>

                <!-- wait_reply -->
                <div v-if="action.type === 'wait_reply'" class="custom-action-params">
                  <div class="form-row" style="margin-bottom:0">
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelMaxWait') }}</label>
                      <input v-model.number="action.maxWaitMs" class="form-input" type="number" min="1000" step="1000" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelMaxRetries') }}</label>
                      <input v-model.number="action.maxRetries" class="form-input" type="number" min="0" max="10" />
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">{{ t('jobs.custom.labelSuccessContains') }}</label>
                    <input v-model.trim="action.successContains" class="form-input" :placeholder="t('jobs.custom.successContainsPlaceholder')" />
                    <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.successContainsHint') }}</div>
                  </div>
                  <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">{{ t('jobs.custom.labelFailContains') }}</label>
                    <input v-model.trim="action.failContains" class="form-input" :placeholder="t('jobs.custom.failContainsPlaceholder')" />
                    <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.custom.failContainsHint') }}</div>
                  </div>
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

                <!-- enter_captcha -->
                <div v-if="action.type === 'enter_captcha'" class="custom-action-params">
                  <div class="form-row" style="margin-bottom:0">
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelMaxWait') }}</label>
                      <input v-model.number="action.maxWaitMs" class="form-input" type="number" min="1000" step="1000" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelCaptchaLength') }}</label>
                      <input v-model.trim="action.captchaLength" class="form-input" type="number" min="1" max="20" :placeholder="t('jobs.aiInputLengthPlaceholder')" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">{{ t('jobs.custom.labelMaxRetries') }}</label>
                      <input v-model.number="action.maxRetries" class="form-input" type="number" min="0" max="10" />
                    </div>
                  </div>
                  <div style="font-size:11px;color:#aaa;margin-top:3px">{{ t('jobs.aiInputLengthHint') }}</div>
                  <div v-if="aiKeyMissing" style="font-size:11px;color:#e63946;margin-top:4px">{{ t('jobs.aiKeyWarning') }}</div>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" @click="addAction">
                <i class="fa-solid fa-plus"></i> {{ t('jobs.custom.addAction') }}
              </button>
            </div>
          </template>

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

        </div><!-- end modal-body -->
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showForm = false"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveTemplate">
            <i class="fa-solid fa-floppy-disk"></i> {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import modal -->
    <div v-if="showImport" class="modal-backdrop">
      <div class="modal" style="width:480px">
        <h3 class="modal-title">{{ t('templates.importTitle') }}</h3>
        <div class="modal-body">
          <div v-if="importError" class="error-msg">{{ importError }}</div>
          <div class="form-group">
            <label class="form-label">{{ t('templates.importLabel') }}</label>
            <textarea
              v-model="importJson"
              class="form-input"
              rows="10"
              style="font-family:monospace;font-size:12px;resize:vertical"
              :placeholder="t('templates.importPlaceholder')"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showImport = false"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="importing" @click="doImport">
            <i class="fa-solid fa-file-import"></i> {{ importing ? t('common.saving') : t('templates.importConfirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile action sheet -->
    <div v-if="actionMenuTpl" class="action-sheet-backdrop" @click="actionMenuTpl = null">
      <div class="action-sheet" @click.stop>
        <div class="action-sheet-header">{{ actionMenuTpl.name }}</div>
        <button class="action-sheet-btn" @click="shareTemplate(actionMenuTpl!); actionMenuTpl = null">
          <i class="fa-solid fa-share-nodes"></i> {{ t('templates.shareBtn') }}
        </button>
        <button class="action-sheet-btn" @click="openEdit(actionMenuTpl!); actionMenuTpl = null">
          <i class="fa-solid fa-pen"></i> {{ t('common.edit') }}
        </button>
        <button class="action-sheet-btn danger" @click="remove(actionMenuTpl!.id); actionMenuTpl = null">
          <i class="fa-solid fa-trash"></i> {{ t('common.delete') }}
        </button>
        <div class="action-sheet-divider"></div>
        <button class="action-sheet-btn action-sheet-cancel" @click="actionMenuTpl = null">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { templatesApi, settingsApi, type JobTemplate, type Settings, type UAPreset, type EmbywatchConfig, type CustomConfig, type CustomAction } from '../api/client';
import { t } from '../i18n';

type CustomActionForm = {
  type: 'send_command' | 'wait_reply' | 'delay' | 'click_button' | 'enter_captcha';
  content: string;
  contentDropdown: string;
  contentCustom: string;
  contentAiInputLength: string;
  maxWaitMs: number;
  waitMs: number;
  button: string;
  buttonDropdown: string;
  buttonCustom: string;
  buttonAiHint: string;
  maxRetries: number;
  captchaLength: string;
  successContains: string;
  failContains: string;
};

const templates = ref<JobTemplate[]>([]);
const settings = ref<Settings | null>(null);
const uaPresets = computed<UAPreset[]>(() => {
  try { return JSON.parse(settings.value?.ua_presets ?? '[]'); } catch { return []; }
});
const aiKeyMissing = computed(() => !settings.value?.ai_api_key);

const showForm = ref(false);
const editTarget = ref<JobTemplate | null>(null);
const formError = ref('');
const saving = ref(false);
const actionMenuTpl = ref<JobTemplate | null>(null);

const showImport = ref(false);
const importJson = ref('');
const importError = ref('');
const importing = ref(false);
const copiedTplId = ref<number | null>(null);

const customActions = ref<CustomActionForm[]>([]);
const customJobMaxRetries = ref(1);

const form = reactive({
  name: '',
  jobType: 'checkin' as 'checkin' | 'embywatch' | 'custom',
  botUsername: '',
  timezone: 'Australia/Sydney',
  replyTimeoutMs: 40000,
  retryMax: 5,
});

const embyCfg = reactive<{ username: string; password: string; playDuration: number | string; userAgent: string; markWatched: boolean }>({
  username: '',
  password: '',
  playDuration: '',
  userAgent: '',
  markWatched: true,
});
const embyUaDropdown = ref('');
const embyServer = reactive<{ protocol: 'https' | 'http'; host: string; port: number | '' }>({
  protocol: 'https',
  host: '',
  port: 443,
});

const CMD_PRESETS = new Set(['', '/start', '/checkin']);
const ACTION_CMD_PRESETS = new Set(['/start', '/checkin']);
const ACTION_BTN_PRESETS = new Set(['签到', '{anyBtn}']);
const BTN_PRESETS = new Set(['', '签到', '{aiBtn}', '{anyBtn}']);
const cmdDropdown = ref('');
const cmdCustom = ref('');
const btnDropdown = ref('');
const btnCustom = ref('');
const btnAiHint = ref('');

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

function setUaState(ua: string) {
  if (!ua) { embyUaDropdown.value = ''; return; }
  const match = uaPresets.value.find(p => p.value === ua);
  embyUaDropdown.value = match ? match.name : '__custom__';
}

function onUaDropdownChange() {
  if (embyUaDropdown.value === '') { embyCfg.userAgent = ''; return; }
  if (embyUaDropdown.value === '__custom__') return;
  const preset = uaPresets.value.find(p => p.name === embyUaDropdown.value);
  if (preset) embyCfg.userAgent = preset.value;
}

function onJobTypeChange() {
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  embyUaDropdown.value = '';
  customActions.value = [];
  customJobMaxRetries.value = 1;
  btnAiHint.value = '';
  setCmdState(''); setBtnState('');
}

function defaultAction(): CustomActionForm {
  return {
    type: 'send_command', content: '/start', contentDropdown: '/start', contentCustom: '',
    contentAiInputLength: '', maxWaitMs: 30000, waitMs: 2000, button: '签到',
    buttonDropdown: '签到', buttonCustom: '', buttonAiHint: '', maxRetries: 3,
    captchaLength: '', successContains: '', failContains: '',
  };
}

function addAction() { customActions.value.push(defaultAction()); }
function removeAction(i: number) { customActions.value.splice(i, 1); }
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

function jobTypeBadge(type: string) {
  const map: Record<string, string> = {
    checkin: 'badge badge-blue',
    embywatch: 'badge badge-purple',
    custom: 'badge badge-amber',
  };
  return map[type] ?? 'badge badge-grey';
}

function handleEmbyHostPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')?.trim();
  if (!text) return;
  const match = text.match(/^(?:(https?):\/\/)?([^:/\s]+)(?::(\d+))?(?:\/.*)?$/i);
  if (!match) return;
  const [, proto, host, portStr] = match;
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
    const cfg: CustomConfig = {
      actions: customActions.value.map(a => {
        if (a.type === 'send_command') {
          let content: string;
          if (a.contentDropdown === '{aiInput}') {
            content = a.contentAiInputLength ? `{aiInput:${a.contentAiInputLength}}` : '{aiInput}';
          } else {
            content = a.contentDropdown === 'custom' ? a.contentCustom : a.contentDropdown;
          }
          return { type: 'send_command' as const, content, ...(a.maxRetries > 0 ? { maxRetries: a.maxRetries } : {}) };
        }
        if (a.type === 'wait_reply') {
          return {
            type: 'wait_reply' as const,
            maxWaitMs: a.maxWaitMs,
            ...(a.successContains.trim() ? { successContains: a.successContains.trim() } : {}),
            ...(a.failContains.trim() ? { failContains: a.failContains.trim() } : {}),
            ...(a.maxRetries > 0 ? { maxRetries: a.maxRetries } : {}),
          };
        }
        if (a.type === 'delay') return { type: 'delay' as const, waitMs: a.waitMs };
        if (a.type === 'enter_captcha') {
          const captchaLength = a.captchaLength ? parseInt(a.captchaLength) || undefined : undefined;
          return { type: 'enter_captcha' as const, maxWaitMs: a.maxWaitMs, captchaLength, ...(a.maxRetries > 0 ? { maxRetries: a.maxRetries } : {}) };
        }
        let button: string;
        if (a.buttonDropdown === 'custom') button = a.buttonCustom;
        else if (a.buttonDropdown === '{aiBtn}') button = a.buttonAiHint.trim() ? `{aiBtn:${a.buttonAiHint.trim()}}` : '{aiBtn}';
        else button = a.buttonDropdown || '签到';
        return { type: 'click_button' as const, button, maxRetries: a.maxRetries, maxWaitMs: a.maxWaitMs };
      }),
    };
    if (customJobMaxRetries.value > 1) cfg.maxRetries = customJobMaxRetries.value;
    return cfg;
  }
  return null;
}

onMounted(async () => {
  await Promise.all([loadTemplates(), loadSettings()]);
});

async function loadTemplates() {
  templates.value = await templatesApi.list();
}

async function loadSettings() {
  try { settings.value = await settingsApi.get(); } catch { /* ignore */ }
}

function openAdd() {
  editTarget.value = null;
  Object.assign(form, {
    name: '',
    jobType: 'checkin',
    botUsername: '',
    timezone: settings.value?.default_timezone ?? 'Australia/Sydney',
    replyTimeoutMs: 40000,
    retryMax: Number(settings.value?.default_max_retry ?? 5),
  });
  Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
  Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
  embyUaDropdown.value = '';
  customActions.value = [];
  customJobMaxRetries.value = 1;
  setCmdState(''); setBtnState('');
  formError.value = '';
  showForm.value = true;
}

function openEdit(tpl: JobTemplate) {
  editTarget.value = tpl;
  Object.assign(form, {
    name: tpl.name,
    jobType: tpl.jobType,
    botUsername: tpl.botUsername,
    timezone: tpl.timezone,
    replyTimeoutMs: tpl.replyTimeoutMs,
    retryMax: tpl.retryMax,
  });
  setCmdState(tpl.startCommand === '/start' ? '' : (tpl.startCommand ?? ''));
  setBtnState(tpl.checkinButton === '签到' ? '' : (tpl.checkinButton ?? ''));

  if (tpl.jobType === 'embywatch') {
    const m = tpl.botUsername.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
    Object.assign(embyServer, {
      protocol: (m?.[1] ?? 'https') as 'https' | 'http',
      host: m?.[2] ?? tpl.botUsername,
      port: m?.[3] ? Number(m[3]) : 443,
    });
    if (tpl.config) {
      try {
        let c = JSON.parse(tpl.config) as EmbywatchConfig | string;
        if (typeof c === 'string') c = JSON.parse(c) as EmbywatchConfig;
        Object.assign(embyCfg, {
          username: c.username ?? '',
          password: c.password ?? '',
          playDuration: c.playDuration ?? '',
          userAgent: c.userAgent ?? '',
          markWatched: c.markWatched !== false,
        });
        setUaState(c.userAgent ?? '');
      } catch {
        Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
        embyUaDropdown.value = '';
      }
    } else {
      Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
      embyUaDropdown.value = '';
    }
  } else if (tpl.jobType === 'custom') {
    Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
    Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
    if (tpl.config) {
      try {
        const cfg = JSON.parse(tpl.config) as CustomConfig;
        customJobMaxRetries.value = cfg.maxRetries ?? 1;
        customActions.value = cfg.actions.map((a: CustomAction) => {
          const base = defaultAction();
          if (a.type === 'send_command') {
            const aiInputMatch = a.content.match(/^\{aiInput(?::(\d+))?\}$/);
            if (aiInputMatch) {
              return { ...base, type: 'send_command' as const, content: a.content, contentDropdown: '{aiInput}', contentCustom: '', contentAiInputLength: aiInputMatch[1] ?? '', maxRetries: a.maxRetries ?? 0 };
            }
            const contentDropdown = ACTION_CMD_PRESETS.has(a.content) ? a.content : 'custom';
            return { ...base, type: 'send_command' as const, content: a.content, contentDropdown, contentCustom: contentDropdown === 'custom' ? a.content : '', contentAiInputLength: '', maxRetries: a.maxRetries ?? 0 };
          }
          if (a.type === 'wait_reply') return { ...base, type: 'wait_reply' as const, maxWaitMs: a.maxWaitMs, successContains: a.successContains ?? '', failContains: a.failContains ?? '', maxRetries: a.maxRetries ?? 0 };
          if (a.type === 'delay') return { ...base, type: 'delay' as const, waitMs: a.waitMs };
          if (a.type === 'enter_captcha') return { ...base, type: 'enter_captcha' as const, maxWaitMs: a.maxWaitMs, captchaLength: String(a.captchaLength ?? ''), maxRetries: a.maxRetries ?? 0 };
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
            return { ...base, type: 'click_button' as const, button: a.button, buttonDropdown, buttonCustom, buttonAiHint, maxRetries: a.maxRetries, maxWaitMs: a.maxWaitMs };
          }
          return base;
        });
      } catch { customActions.value = []; customJobMaxRetries.value = 1; }
    } else {
      customActions.value = [];
      customJobMaxRetries.value = 1;
    }
  } else {
    Object.assign(embyCfg, { username: '', password: '', playDuration: '', userAgent: '', markWatched: true });
    Object.assign(embyServer, { protocol: 'https', host: '', port: 443 });
    customActions.value = [];
  }
  formError.value = '';
  showForm.value = true;
}

async function saveTemplate() {
  formError.value = '';
  if (!form.name) { formError.value = t('jobs.errors.nameRequired'); return; }
  if (form.jobType === 'custom') {
    if (!form.botUsername) { formError.value = t('jobs.errors.botRequired'); return; }
    if (customActions.value.length === 0) { formError.value = t('jobs.errors.customActionsRequired'); return; }
  }
  if (form.jobType === 'embywatch') {
    if (!embyServer.host) { formError.value = t('jobs.errors.hostRequired'); return; }
    const portPart = (embyServer.port as number | string) !== '' ? `:${embyServer.port}` : '';
    form.botUsername = `${embyServer.protocol}://${embyServer.host.replace(/^https?:\/\//, '')}${portPart}`;
    if (!embyCfg.username || !embyCfg.password) {
      formError.value = t('jobs.errors.embyCredRequired');
      return;
    }
  }
  if (form.jobType === 'checkin' && !form.botUsername) {
    formError.value = t('jobs.errors.botRequired');
    return;
  }
  if (form.jobType === 'checkin') form.botUsername = form.botUsername.replace(/^@+/, '');

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
      // config is serialised by the backend; pass as-is
      config: rawCfg as unknown as string | null,
      startCommand,
      checkinButton,
    };
    if (editTarget.value) {
      await templatesApi.update(editTarget.value.id, payload);
    } else {
      await templatesApi.create(payload);
    }
    showForm.value = false;
    await loadTemplates();
  } catch (err: any) {
    formError.value = err.response?.data?.error ?? t('common.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!confirm(t('templates.confirmDelete'))) return;
  await templatesApi.delete(id);
  await loadTemplates();
}

const SHARE_KEYS: (keyof JobTemplate)[] = ['name', 'jobType', 'botUsername', 'timezone', 'replyTimeoutMs', 'retryMax', 'config', 'startCommand', 'checkinButton'];

async function shareTemplate(tpl: JobTemplate) {
  const text = JSON.stringify(Object.fromEntries(SHARE_KEYS.map(k => [k, tpl[k]])), null, 2);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback for HTTP (non-secure) contexts
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
  copiedTplId.value = tpl.id;
  setTimeout(() => { copiedTplId.value = null; }, 1500);
}

function openImport() {
  importJson.value = '';
  importError.value = '';
  showImport.value = true;
}

async function doImport() {
  importError.value = '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(importJson.value);
  } catch {
    importError.value = t('templates.importError');
    return;
  }
  if (!('name' in parsed) || !('jobType' in parsed)) {
    importError.value = t('templates.importError');
    return;
  }
  // config arrives as a string from the exported JSON; parse it to an object
  // so the backend doesn't double-stringify it
  if (typeof parsed.config === 'string') {
    try { parsed.config = JSON.parse(parsed.config); } catch { /* leave as-is */ }
  }
  importing.value = true;
  try {
    await templatesApi.create(parsed as Partial<JobTemplate>);
    showImport.value = false;
    await loadTemplates();
  } catch (err: any) {
    importError.value = err.response?.data?.error ?? t('common.saveFailed');
  } finally {
    importing.value = false;
  }
}
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
