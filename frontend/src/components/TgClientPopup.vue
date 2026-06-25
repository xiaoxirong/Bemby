<template>
  <div class="tgc-backdrop" @click.self="$emit('close')">
    <div class="tgc-popup">
      <!-- Header -->
      <div class="tgc-header">
        <div class="tgc-header-left">
          <svg
            class="tgc-logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path
              d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.018 9.51c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.881.71z"
            />
          </svg>
          <span class="tgc-title">Messenger</span>
          <select
            v-model="selectedAccountId"
            class="tgc-account-select"
            @change="onAccountChange"
          >
            <option
              v-for="acc in authenticatedAccounts"
              :key="acc.id"
              :value="acc.id"
            >
              {{ acc.name }}
            </option>
          </select>
        </div>
        <div class="tgc-header-right">
          <button
            class="tgc-icon-btn"
            title="Contacts"
            @click="showContacts = true"
          >
            <i class="fa-solid fa-address-book"></i>
          </button>
          <button
            class="tgc-icon-btn tgc-close-btn"
            @click="$emit('close')"
            title="Close"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="tgc-body" :class="{ 'chat-open': showMobileChat }">
        <!-- Sidebar: dialog list -->
        <div class="tgc-sidebar">
          <div class="tgc-search-wrap">
            <i class="fa-solid fa-magnifying-glass tgc-search-icon"></i>
            <input
              v-model="searchQuery"
              class="tgc-search-input"
              placeholder="Search chats..."
              @input="onSearchInput"
            />
            <button
              v-if="searchQuery"
              class="tgc-search-clear"
              @click="
                searchQuery = '';
                searchResults = null;
              "
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div v-if="tgFolders.length" class="tgc-folder-tabs-wrap">
            <div class="tgc-folder-tabs">
              <button
                class="tgc-folder-tab"
                :class="{ active: activeFolder === 'all' }"
                @click="activeFolder = 'all'"
              >
                All
              </button>
              <button
                v-for="f in tgFolders"
                :key="f.id"
                class="tgc-folder-tab"
                :class="{ active: activeFolder === f.id }"
                @click="activeFolder = f.id"
              >
                {{ f.emoticon ? f.emoticon + " " : "" }}{{ f.title }}
              </button>
            </div>
          </div>

          <div class="tgc-dialog-list">
            <div v-if="loadingDialogs" class="tgc-spinner-wrap">
              <span class="tgc-spinner"></span>
            </div>
            <div v-else-if="dialogError" class="tgc-list-error">
              {{ dialogError }}
            </div>
            <template v-else>
              <div
                v-for="d in displayedDialogs"
                :key="d.chatId"
                class="tgc-dialog-item"
                :class="{ active: activeChatId === d.chatId }"
                @click="openChat(d)"
                @contextmenu="onDialogContextMenu($event, d)"
                @touchstart.passive="onDialogTouchStart($event, d)"
                @touchend.passive="onDialogTouchEnd"
                @touchmove.passive="onDialogTouchEnd"
              >
                <div class="tgc-avatar" :class="`tgc-avatar-${d.type}`">
                  <img
                    :src="avatarUrl(d.chatId)"
                    class="tgc-avatar-photo"
                    loading="lazy"
                    alt=""
                    @error="
                      (e: Event) =>
                        ((e.target as HTMLImageElement).style.display = 'none')
                    "
                  />
                  {{ avatarLetter(d.name) }}
                </div>
                <div class="tgc-dialog-info">
                  <div class="tgc-dialog-row">
                    <span class="tgc-dialog-name">{{ d.name }}</span>
                    <span class="tgc-dialog-time">{{
                      d.lastMessage ? fmtTime(d.lastMessage.date) : ""
                    }}</span>
                  </div>
                  <div class="tgc-dialog-row">
                    <span class="tgc-dialog-preview">{{
                      d.lastMessage?.text || ""
                    }}</span>
                    <span v-if="d.unreadCount > 0" class="tgc-unread-badge">{{
                      d.unreadCount > 99 ? "99+" : d.unreadCount
                    }}</span>
                  </div>
                </div>
              </div>
              <div
                v-if="!displayedDialogs.length && !loadingDialogs"
                class="tgc-empty-list"
              >
                No chats found
              </div>
            </template>
          </div>
        </div>

        <!-- Chat + profile panel -->
        <template v-if="activeChat">
          <div class="tgc-chat">
            <div class="tgc-chat-header">
              <button class="tgc-back-btn" @click="backToDialogs" title="Back">
                <i class="fa-solid fa-arrow-left"></i>
              </button>
              <div
                class="tgc-avatar tgc-avatar-sm tgc-clickable"
                :class="`tgc-avatar-${activeChat.type}`"
                @click="openProfile"
              >
                <img
                  :src="avatarUrl(activeChat.chatId)"
                  class="tgc-avatar-photo"
                  loading="lazy"
                  alt=""
                  @error="
                    (e: Event) =>
                      ((e.target as HTMLImageElement).style.display = 'none')
                  "
                />
                {{ avatarLetter(activeChat.name) }}
              </div>
              <div
                class="tgc-chat-title-wrap tgc-clickable"
                @click="openProfile"
              >
                <div class="tgc-chat-name">{{ activeChat.name }}</div>
                <div class="tgc-chat-sub" v-if="activeChat.username">
                  @{{ activeChat.username }}
                </div>
              </div>
            </div>

            <div class="tgc-messages" ref="messagesEl" @scroll="onMsgScroll">
              <div v-if="loadingOlder" class="tgc-load-more">
                <span class="tgc-spinner"></span>
              </div>
              <div
                v-if="canLoadMore && !loadingOlder && messages.length >= 50"
                class="tgc-load-more"
              >
                <button class="tgc-load-more-btn" @click="loadOlderMessages">
                  Load older messages
                </button>
              </div>
              <div
                v-if="loadingMessages"
                class="tgc-spinner-wrap"
                style="height: 100%"
              >
                <span class="tgc-spinner"></span>
              </div>
              <template v-else>
                <div v-for="(msg, idx) in messages" :key="msg.id">
                  <!-- Date separator -->
                  <div
                    v-if="
                      idx === 0 || !sameDay(messages[idx - 1].date, msg.date)
                    "
                    class="tgc-date-sep"
                  >
                    {{ fmtDate(msg.date) }}
                  </div>

                  <div
                    class="tgc-msg-wrap"
                    :class="msg.fromMe ? 'tgc-msg-out' : 'tgc-msg-in'"
                  >
                    <div class="tgc-msg-bubble">
                      <div
                        v-if="
                          !msg.fromMe &&
                          activeChat.type !== 'user' &&
                          activeChat.type !== 'bot' &&
                          msg.fromName
                        "
                        class="tgc-msg-sender"
                      >
                        {{ msg.fromName }}
                      </div>
                      <img
                        v-if="msg.hasPhoto"
                        :src="photoUrl(msg.id)"
                        class="tgc-msg-photo"
                        loading="lazy"
                        @error="
                          (e: Event) =>
                            ((e.target as HTMLImageElement).style.display =
                              'none')
                        "
                      />
                      <div v-if="msg.text" class="tgc-msg-text">
                        {{ msg.text }}
                      </div>
                      <div
                        v-if="!msg.text && msg.hasDocument"
                        class="tgc-msg-text tgc-msg-doc"
                      >
                        <i class="fa-solid fa-file"></i> Document
                      </div>
                      <div class="tgc-msg-meta">
                        <span class="tgc-msg-time">{{
                          fmtMsgTime(msg.date)
                        }}</span>
                        <i
                          v-if="msg.fromMe"
                          class="fa-solid fa-check tgc-msg-tick"
                        ></i>
                      </div>
                      <!-- Inline keyboard buttons -->
                      <div v-if="msg.buttons" class="tgc-msg-buttons">
                        <div
                          v-for="(row, ri) in msg.buttons"
                          :key="ri"
                          class="tgc-btn-row"
                        >
                          <button
                            v-for="(btn, bi) in row"
                            :key="bi"
                            class="tgc-btn-chip"
                            :class="{
                              'tgc-btn-loading':
                                btnLoadingKey === `${msg.id}-${ri}-${bi}`,
                            }"
                            :disabled="
                              (!btn.data && !btn.url) ||
                              btnLoadingKey === `${msg.id}-${ri}-${bi}`
                            "
                            @click="clickInlineButton(msg, btn, ri, bi)"
                          >
                            {{ btn.text }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!messages.length" class="tgc-empty-chat">
                  No messages yet
                </div>
              </template>
            </div>

            <div class="tgc-compose">
              <textarea
                v-model="inputText"
                class="tgc-input"
                placeholder="Write a message..."
                rows="1"
                @keydown="onComposeKey"
                @input="autoResize"
                ref="inputEl"
              ></textarea>
              <button
                class="tgc-send-btn"
                :disabled="!inputText.trim() || sending"
                @click="sendMessage"
                title="Send (Enter)"
              >
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>

          <!-- Profile info panel (flex sibling of chat) -->
          <div v-if="showProfile" class="tgc-profile-panel">
            <div class="tgc-profile-header">
              <span class="tgc-profile-title">Info</span>
              <button class="tgc-icon-btn" @click="showProfile = false">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div v-if="profileLoading" class="tgc-spinner-wrap" style="flex: 1">
              <span class="tgc-spinner"></span>
            </div>
            <div v-else-if="profileDetails" class="tgc-profile-body">
              <div class="tgc-profile-avatar-wrap">
                <div
                  class="tgc-profile-avatar"
                  :class="`tgc-avatar-${profileDetails.type}`"
                >
                  <img
                    :src="avatarUrl(profileDetails.chatId)"
                    class="tgc-avatar-photo"
                    alt=""
                    @error="
                      (e: Event) =>
                        ((e.target as HTMLImageElement).style.display = 'none')
                    "
                  />
                  {{ avatarLetter(profileDetails.name) }}
                </div>
                <div class="tgc-profile-name">{{ profileDetails.name }}</div>
                <div class="tgc-profile-type-badge">
                  {{ profileDetails.type }}
                </div>
              </div>

              <div class="tgc-profile-rows">
                <div
                  v-if="profileDetails.username"
                  class="tgc-profile-row"
                  @click="copyField('@' + profileDetails.username)"
                >
                  <i class="fa-solid fa-at tgc-profile-row-icon"></i>
                  <div class="tgc-profile-row-body">
                    <div class="tgc-profile-row-label">Username</div>
                    <div class="tgc-profile-row-value">
                      @{{ profileDetails.username }}
                    </div>
                  </div>
                  <i class="fa-regular fa-copy tgc-copy-icon"></i>
                </div>

                <div
                  v-if="profileDetails.phone"
                  class="tgc-profile-row"
                  @click="copyField(profileDetails.phone!)"
                >
                  <i class="fa-solid fa-phone tgc-profile-row-icon"></i>
                  <div class="tgc-profile-row-body">
                    <div class="tgc-profile-row-label">Phone</div>
                    <div class="tgc-profile-row-value">
                      {{ profileDetails.phone }}
                    </div>
                  </div>
                  <i class="fa-regular fa-copy tgc-copy-icon"></i>
                </div>

                <div
                  v-if="profileDetails.bio"
                  class="tgc-profile-row tgc-profile-row-nocopy"
                >
                  <i class="fa-solid fa-circle-info tgc-profile-row-icon"></i>
                  <div class="tgc-profile-row-body">
                    <div class="tgc-profile-row-label">Bio</div>
                    <div class="tgc-profile-row-value tgc-bio-text">
                      {{ profileDetails.bio }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="profileDetails.memberCount"
                  class="tgc-profile-row tgc-profile-row-nocopy"
                >
                  <i class="fa-solid fa-users tgc-profile-row-icon"></i>
                  <div class="tgc-profile-row-body">
                    <div class="tgc-profile-row-label">Members</div>
                    <div class="tgc-profile-row-value">
                      {{ profileDetails.memberCount.toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <div class="tgc-empty-state" v-else>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="56"
            height="56"
            style="opacity: 0.25"
          >
            <path
              d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.018 9.51c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.881.71z"
            />
          </svg>
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
      <!-- end tgc-body -->
    </div>
    <!-- end tgc-popup -->

    <!-- Context menu dismiss backdrop -->
    <div
      v-if="ctxMenu"
      class="tgc-ctx-backdrop"
      @click="closeCtx"
      @contextmenu.prevent="closeCtx"
    ></div>

    <!-- Dialog context menu (right-click / long-press) -->
    <div
      v-if="ctxMenu"
      class="tgc-ctx-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
    >
      <button class="tgc-ctx-item" @click="ctxMute(0)">
        <i class="fa-solid fa-bell"></i> Unmute
      </button>
      <button class="tgc-ctx-item" @click="ctxMute(8 * 3600)">
        <i class="fa-solid fa-bell-slash"></i> Mute 8 hours
      </button>
      <button class="tgc-ctx-item" @click="ctxMute(7 * 24 * 3600)">
        <i class="fa-solid fa-bell-slash"></i> Mute 1 week
      </button>
      <button class="tgc-ctx-item" @click="ctxMute(365 * 24 * 3600)">
        <i class="fa-solid fa-bell-slash"></i> Mute forever
      </button>
      <div class="tgc-ctx-divider"></div>
      <button class="tgc-ctx-item" @click="ctxPin(true)">
        <i class="fa-solid fa-thumbtack"></i> Pin
      </button>
      <button class="tgc-ctx-item" @click="ctxPin(false)">
        <i class="fa-regular fa-thumbtack"></i> Unpin
      </button>
    </div>

    <!-- Copy toast -->
    <div v-if="copyToast" class="tgc-copy-toast">{{ copyToast }}</div>

    <!-- Contacts sub-panel -->
    <div
      v-if="showContacts"
      class="tgc-contacts-overlay"
      @click.self="showContacts = false"
    >
      <div class="tgc-contacts-panel">
        <div class="tgc-contacts-header">
          <span>Contacts</span>
          <button class="tgc-icon-btn" @click="showContacts = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="tgc-contacts-search">
          <i class="fa-solid fa-magnifying-glass tgc-search-icon"></i>
          <input
            v-model="contactSearch"
            class="tgc-search-input"
            placeholder="Search contacts..."
          />
        </div>

        <div class="tgc-contact-list">
          <div v-if="loadingContacts" class="tgc-spinner-wrap">
            <span class="tgc-spinner"></span>
          </div>
          <template v-else>
            <div
              v-for="c in filteredContacts"
              :key="c.chatId"
              class="tgc-contact-item"
              @click="openContactChat(c)"
            >
              <div class="tgc-avatar tgc-avatar-user tgc-avatar-sm">
                {{ avatarLetter(c.firstName || c.username || "?") }}
              </div>
              <div class="tgc-contact-info">
                <div class="tgc-contact-name">
                  {{ c.firstName }} {{ c.lastName }}
                </div>
                <div class="tgc-contact-sub">
                  {{ c.username ? "@" + c.username : (c.phone ?? "") }}
                </div>
              </div>
            </div>
            <div v-if="!filteredContacts.length" class="tgc-empty-list">
              No contacts
            </div>
          </template>
        </div>

        <!-- Add contact form -->
        <div class="tgc-add-contact">
          <div class="tgc-add-contact-title">Add Contact</div>
          <div class="tgc-add-contact-fields">
            <input
              v-model="newPhone"
              class="form-input"
              placeholder="+1234567890"
            />
            <input
              v-model="newFirstName"
              class="form-input"
              placeholder="First name"
            />
            <button
              class="btn btn-primary"
              :disabled="
                !newPhone.trim() || !newFirstName.trim() || addingContact
              "
              @click="addContactSubmit"
            >
              {{ addingContact ? "..." : "Add" }}
            </button>
          </div>
          <div v-if="addContactError" class="error-msg" style="margin-top: 6px">
            {{ addContactError }}
          </div>
          <div v-if="addContactOk" class="success-msg" style="margin-top: 6px">
            Contact added!
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- end tgc-backdrop -->
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  accountsApi,
  tgClientApi,
  type Account,
  type TgDialog,
  type TgMessage,
  type TgContact,
  type TgFolder,
  type TgProfile,
} from "../api/client";

const emit = defineEmits<{ close: [] }>();

// ── State ─────────────────────────────────────────────────────────────────────

const accounts = ref<Account[]>([]);
const authenticatedAccounts = computed(() =>
  accounts.value.filter((a) => a.authStatus === "authenticated" && !a.disabled),
);

const selectedAccountId = ref<number | null>(null);
const dialogs = ref<TgDialog[]>([]);
const loadingDialogs = ref(false);
const dialogError = ref("");

const searchQuery = ref("");
const searchResults = ref<TgDialog[] | null>(null);
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const activeChatId = ref<string | null>(null);
const activeChat = ref<TgDialog | null>(null);
const messages = ref<TgMessage[]>([]);
const loadingMessages = ref(false);
const loadingOlder = ref(false);
const canLoadMore = ref(true);
const sending = ref(false);
const inputText = ref("");

const showContacts = ref(false);
const contacts = ref<TgContact[]>([]);
const loadingContacts = ref(false);
const contactSearch = ref("");
const newPhone = ref("");
const newFirstName = ref("");
const addingContact = ref(false);
const addContactError = ref("");
const addContactOk = ref(false);

const messagesEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const showMobileChat = ref(false);
const showProfile = ref(false);
const profileDetails = ref<TgProfile | null>(null);
const profileLoading = ref(false);
const copyToast = ref("");
const btnLoadingKey = ref<string | null>(null);

// Context menu for dialog actions
const ctxMenu = ref<{ dialog: TgDialog; x: number; y: number } | null>(null);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
const tgFolders = ref<TgFolder[]>([]);
const activeFolder = ref<"all" | number>("all");

let evtSource: EventSource | null = null;
let scrolledToBottom = true;

// ── Computed ──────────────────────────────────────────────────────────────────

const displayedDialogs = computed(() => {
  const base = searchResults.value ?? dialogs.value;
  if (activeFolder.value === "all") return base;

  const folder = tgFolders.value.find((f) => f.id === activeFolder.value);
  if (!folder) return base;

  return base.filter((d) => {
    if (folder.excludedChatIds.includes(d.chatId)) return false;
    if (folder.pinnedChatIds.includes(d.chatId)) return true;
    if (folder.includedChatIds.includes(d.chatId)) return true;
    if (folder.includeBots && d.type === "bot") return true;
    if (
      (folder.includeContacts || folder.includeNonContacts) &&
      d.type === "user"
    )
      return true;
    if (folder.includeGroups && d.type === "group") return true;
    if (folder.includeBroadcasts && d.type === "channel") return true;
    return false;
  });
});

const filteredContacts = computed(() => {
  const q = contactSearch.value.toLowerCase();
  if (!q) return contacts.value;
  return contacts.value.filter((c) =>
    [c.firstName, c.lastName, c.username, c.phone].some((v) =>
      v?.toLowerCase().includes(q),
    ),
  );
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  accounts.value = await accountsApi.list().catch(() => []);
  if (authenticatedAccounts.value.length) {
    selectedAccountId.value = authenticatedAccounts.value[0].id;
    await loadDialogs();
    startSSE();
  }
});

onBeforeUnmount(() => {
  evtSource?.close();
  if (searchTimer.value) clearTimeout(searchTimer.value);
});

watch(showContacts, async (val) => {
  if (val && !contacts.value.length) await loadContacts();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function onDialogContextMenu(e: MouseEvent, dialog: TgDialog) {
  e.preventDefault();
  ctxMenu.value = { dialog, x: e.clientX, y: e.clientY };
}

function onDialogTouchStart(e: TouchEvent, dialog: TgDialog) {
  longPressTimer = setTimeout(() => {
    const t = e.touches[0];
    ctxMenu.value = { dialog, x: t.clientX, y: t.clientY };
  }, 500);
}

function onDialogTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function closeCtx() {
  ctxMenu.value = null;
}

async function ctxMute(secs: number) {
  if (!ctxMenu.value || !selectedAccountId.value) return;
  const { dialog } = ctxMenu.value;
  closeCtx();
  try {
    await tgClientApi.mute(selectedAccountId.value, dialog.chatId, secs);
    copyToast.value = secs === 0 ? "Unmuted" : "Muted";
    if (copyToastTimer) clearTimeout(copyToastTimer);
    copyToastTimer = setTimeout(() => {
      copyToast.value = "";
    }, 2000);
  } catch {
    /* silent */
  }
}

async function ctxPin(pinned: boolean) {
  if (!ctxMenu.value || !selectedAccountId.value) return;
  const { dialog } = ctxMenu.value;
  closeCtx();
  try {
    await tgClientApi.pin(selectedAccountId.value, dialog.chatId, pinned);
    // Move the dialog to top/remove pin marker in local list
    const idx = dialogs.value.findIndex((d) => d.chatId === dialog.chatId);
    if (idx !== -1) {
      const [d] = dialogs.value.splice(idx, 1);
      if (pinned) dialogs.value.unshift(d);
      else dialogs.value.push(d);
    }
    copyToast.value = pinned ? "Pinned" : "Unpinned";
    if (copyToastTimer) clearTimeout(copyToastTimer);
    copyToastTimer = setTimeout(() => {
      copyToast.value = "";
    }, 2000);
  } catch {
    /* silent */
  }
}

function avatarUrl(chatId: string) {
  if (!selectedAccountId.value) return "";
  return tgClientApi.avatarUrl(selectedAccountId.value, chatId);
}

async function openProfile() {
  if (!selectedAccountId.value || !activeChat.value) return;
  if (showProfile.value) {
    showProfile.value = false;
    return;
  }
  showProfile.value = true;
  profileLoading.value = true;
  profileDetails.value = null;
  try {
    profileDetails.value = await tgClientApi.profile(
      selectedAccountId.value,
      activeChat.value.chatId,
    );
  } catch {
    // Fall back to what we already know from the dialog
    if (activeChat.value) {
      profileDetails.value = {
        chatId: activeChat.value.chatId,
        name: activeChat.value.name,
        type: activeChat.value.type,
        username: activeChat.value.username,
        phone: null,
        bio: null,
        memberCount: null,
      };
    }
  } finally {
    profileLoading.value = false;
  }
}

let copyToastTimer: ReturnType<typeof setTimeout> | null = null;

async function copyField(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const el = document.createElement("textarea");
    el.value = value;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  copyToast.value = "Copied!";
  if (copyToastTimer) clearTimeout(copyToastTimer);
  copyToastTimer = setTimeout(() => {
    copyToast.value = "";
  }, 2000);
}

async function clickInlineButton(
  msg: TgMessage,
  btn: { text: string; data: string | null; url: string | null },
  ri: number,
  bi: number,
) {
  if (!selectedAccountId.value || !activeChatId.value) return;
  if (btn.url) {
    window.open(btn.url, "_blank", "noopener");
    return;
  }
  if (!btn.data) return;
  const key = `${msg.id}-${ri}-${bi}`;
  btnLoadingKey.value = key;
  try {
    const res = await tgClientApi.clickButton(
      selectedAccountId.value,
      activeChatId.value,
      msg.id,
      btn.data,
    );
    if (res.message) {
      copyToast.value = res.message;
      if (copyToastTimer) clearTimeout(copyToastTimer);
      copyToastTimer = setTimeout(() => {
        copyToast.value = "";
      }, 4000);
    }
    if (res.url) window.open(res.url, "_blank", "noopener");
  } catch (e: any) {
    const errMsg =
      e?.response?.data?.error ?? e?.message ?? "Button click failed";
    copyToast.value = errMsg;
    if (copyToastTimer) clearTimeout(copyToastTimer);
    copyToastTimer = setTimeout(() => {
      copyToast.value = "";
    }, 4000);
  } finally {
    btnLoadingKey.value = null;
    // Bots typically edit their message rather than send a new one.
    // Re-fetch recent messages twice to pick up edits.
    setTimeout(refreshMessages, 1200);
    setTimeout(refreshMessages, 3500);
  }
}

// Silently re-fetch the latest messages and merge edits/new messages in-place.
async function refreshMessages() {
  if (!selectedAccountId.value || !activeChatId.value) return;
  try {
    const msgs = await tgClientApi.messages(
      selectedAccountId.value,
      activeChatId.value,
      { limit: 20 },
    );
    const fresh = msgs.reverse(); // oldest first
    let appended = false;
    const lastId = messages.value[messages.value.length - 1]?.id ?? 0;
    for (const msg of fresh) {
      const idx = messages.value.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        // Update edited messages in-place
        messages.value[idx] = msg;
      } else if (msg.id > lastId) {
        messages.value.push(msg);
        appended = true;
      }
    }
    if (appended) await scrollBottom(false);
  } catch {
    // Silent -- best effort
  }
}

function avatarLetter(name: string) {
  return (name || "?").trim()[0].toUpperCase();
}

function fmtTime(ts: number) {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function fmtMsgTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sameDay(a: number, b: number) {
  const da = new Date(a * 1000);
  const db = new Date(b * 1000);
  return da.toDateString() === db.toDateString();
}

function photoUrl(msgId: number) {
  if (!selectedAccountId.value || !activeChatId.value) return "";
  return tgClientApi.photoUrl(
    selectedAccountId.value,
    activeChatId.value,
    msgId,
  );
}

async function scrollBottom(force = false) {
  if (!scrolledToBottom && !force) return;
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function onMsgScroll() {
  const el = messagesEl.value;
  if (!el) return;
  scrolledToBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
}

function autoResize() {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// ── Account change ────────────────────────────────────────────────────────────

async function onAccountChange() {
  evtSource?.close();
  dialogs.value = [];
  activeChatId.value = null;
  activeChat.value = null;
  messages.value = [];
  contacts.value = [];
  searchQuery.value = "";
  searchResults.value = null;
  showMobileChat.value = false;
  activeFolder.value = "all";
  tgFolders.value = [];
  await loadDialogs();
  startSSE();
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

async function loadDialogs() {
  if (!selectedAccountId.value) return;
  loadingDialogs.value = true;
  dialogError.value = "";
  try {
    [dialogs.value, tgFolders.value] = await Promise.all([
      tgClientApi.dialogs(selectedAccountId.value),
      tgClientApi.folders(selectedAccountId.value).catch(() => []),
    ]);
  } catch (e: any) {
    dialogError.value =
      e?.response?.data?.error ?? e.message ?? "Failed to load chats";
  } finally {
    loadingDialogs.value = false;
  }
}

// ── Search ────────────────────────────────────────────────────────────────────

function onSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = null;
    return;
  }

  // First filter local dialogs immediately
  searchResults.value = dialogs.value.filter(
    (d) =>
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.username?.toLowerCase().includes(q.toLowerCase()),
  );

  // Then fetch from Telegram after debounce
  searchTimer.value = setTimeout(async () => {
    if (!selectedAccountId.value) return;
    try {
      const remote = await tgClientApi.search(selectedAccountId.value, q);
      // Merge remote results, dedup by chatId
      const seen = new Set(searchResults.value?.map((d) => d.chatId));
      const merged = [...(searchResults.value ?? [])];
      for (const r of remote) {
        if (!seen.has(r.chatId)) merged.push(r);
      }
      searchResults.value = merged;
    } catch {
      /* silently ignore search errors */
    }
  }, 500);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

async function openChat(dialog: TgDialog) {
  activeChatId.value = dialog.chatId;
  activeChat.value = dialog;
  messages.value = [];
  canLoadMore.value = true;
  scrolledToBottom = true;
  showMobileChat.value = true;
  showProfile.value = false;
  profileDetails.value = null;
  await fetchMessages();
  await nextTick();
  inputEl.value?.focus();
}

function backToDialogs() {
  showMobileChat.value = false;
}

async function fetchMessages() {
  if (!selectedAccountId.value || !activeChatId.value) return;
  loadingMessages.value = true;
  try {
    const msgs = await tgClientApi.messages(
      selectedAccountId.value,
      activeChatId.value,
      { limit: 50 },
    );
    messages.value = msgs.reverse(); // oldest first
    if (msgs.length < 50) canLoadMore.value = false;
    await scrollBottom(true);
  } catch (e: any) {
    console.error("Failed to load messages:", e);
  } finally {
    loadingMessages.value = false;
  }
}

async function loadOlderMessages() {
  if (!selectedAccountId.value || !activeChatId.value || !messages.value.length)
    return;
  loadingOlder.value = true;
  const oldestId = messages.value[0].id;
  const el = messagesEl.value;
  const prevScrollHeight = el?.scrollHeight ?? 0;
  try {
    const older = await tgClientApi.messages(
      selectedAccountId.value,
      activeChatId.value,
      {
        limit: 50,
        offsetId: oldestId,
      },
    );
    if (older.length < 50) canLoadMore.value = false;
    messages.value = [...older.reverse(), ...messages.value];
    await nextTick();
    // Preserve scroll position after prepend
    if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
  } catch (e: any) {
    console.error("Failed to load older messages:", e);
  } finally {
    loadingOlder.value = false;
  }
}

function onComposeKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || !selectedAccountId.value || !activeChatId.value || sending.value)
    return;
  sending.value = true;
  inputText.value = "";
  if (inputEl.value) {
    inputEl.value.style.height = "auto";
  }
  try {
    const result = await tgClientApi.send(
      selectedAccountId.value,
      activeChatId.value,
      text,
    );
    // Optimistically append
    messages.value.push({
      id: result.id,
      text,
      date: result.date,
      fromMe: true,
      fromId: null,
      fromName: null,
      hasPhoto: false,
      hasDocument: false,
      buttons: null,
    });
    await scrollBottom(true);
    // Update dialog preview
    const idx = dialogs.value.findIndex((d) => d.chatId === activeChatId.value);
    if (idx !== -1) {
      dialogs.value[idx] = {
        ...dialogs.value[idx],
        lastMessage: { text, date: result.date, fromMe: true },
      };
      // Sort dialog to top
      const [moved] = dialogs.value.splice(idx, 1);
      dialogs.value.unshift(moved);
    }
  } catch (e: any) {
    console.error("Send failed:", e);
  } finally {
    sending.value = false;
    await nextTick();
    inputEl.value?.focus();
  }
}

// ── SSE ───────────────────────────────────────────────────────────────────────

function startSSE() {
  if (!selectedAccountId.value) return;
  evtSource?.close();
  const token = localStorage.getItem("token");
  const url = tgClientApi.eventsUrl(selectedAccountId.value);
  // SSE with auth header is not directly supported; use URL param as fallback
  evtSource = new EventSource(`${url}?token=${token}`);

  evtSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "message")
        onIncomingMessage(data.chatId as string, data.message as TgMessage);
    } catch {
      /* ignore parse errors */
    }
  };
  evtSource.onerror = () => {
    // SSE will auto-reconnect
  };
}

function onIncomingMessage(chatId: string, msg: TgMessage) {
  // Update dialog preview
  const idx = dialogs.value.findIndex((d) => d.chatId === chatId);
  if (idx !== -1) {
    const updated = {
      ...dialogs.value[idx],
      lastMessage: { text: msg.text, date: msg.date, fromMe: false },
    };
    if (!msg.fromMe && chatId !== activeChatId.value)
      updated.unreadCount = (updated.unreadCount ?? 0) + 1;
    dialogs.value.splice(idx, 1);
    dialogs.value.unshift(updated);
  }

  // Append to open chat
  if (chatId === activeChatId.value) {
    // Avoid duplicate if already optimistically appended
    if (!messages.value.find((m) => m.id === msg.id)) {
      messages.value.push(msg);
      scrollBottom();
    }
    // Reset unread for open chat
    const di = dialogs.value.findIndex((d) => d.chatId === chatId);
    if (di !== -1) dialogs.value[di] = { ...dialogs.value[di], unreadCount: 0 };
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

async function loadContacts() {
  if (!selectedAccountId.value) return;
  loadingContacts.value = true;
  try {
    contacts.value = await tgClientApi.contacts(selectedAccountId.value);
  } catch (e: any) {
    console.error("Failed to load contacts:", e);
  } finally {
    loadingContacts.value = false;
  }
}

function openContactChat(c: TgContact) {
  showContacts.value = false;
  const existing = dialogs.value.find((d) => d.chatId === c.chatId);
  if (existing) {
    openChat(existing);
  } else {
    // Create a synthetic dialog entry for this contact
    const synthetic: TgDialog = {
      chatId: c.chatId,
      name:
        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
        c.username ||
        c.phone ||
        "Unknown",
      type: "user",
      username: c.username,
      unreadCount: 0,
      lastMessage: null,
    };
    dialogs.value.unshift(synthetic);
    openChat(synthetic);
  }
}

async function addContactSubmit() {
  if (!selectedAccountId.value) return;
  addContactError.value = "";
  addContactOk.value = false;
  addingContact.value = true;
  try {
    const c = await tgClientApi.addContact(
      selectedAccountId.value,
      newPhone.value.trim(),
      newFirstName.value.trim(),
    );
    contacts.value.unshift(c);
    newPhone.value = "";
    newFirstName.value = "";
    addContactOk.value = true;
    setTimeout(() => {
      addContactOk.value = false;
    }, 3000);
  } catch (e: any) {
    addContactError.value =
      e?.response?.data?.error ?? e.message ?? "Failed to add contact";
  } finally {
    addingContact.value = false;
  }
}
</script>

<style scoped>
/* ── Overlay ────────────────────────────────────────────────────────────────── */
.tgc-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.tgc-popup {
  background: #fff;
  border-radius: 10px;
  width: 100%;
  max-width: none;
  height: calc(100vh - 32px);
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  position: relative;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.tgc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #e8e9ed;
  flex-shrink: 0;
  gap: 10px;
  background: #fff;
}

.tgc-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tgc-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tgc-logo {
  color: #4361ee;
  flex-shrink: 0;
}

.tgc-title {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  color: #1a1a2e;
}

.tgc-account-select {
  background: #f5f6fa;
  border: 1px solid #e0e0e8;
  color: #1a1a2e;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 13px;
  max-width: 180px;
  cursor: pointer;
  outline: none;
}

.tgc-icon-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 15px;
  transition:
    background 0.15s,
    color 0.15s;
}

.tgc-icon-btn:hover {
  background: #f0f2f5;
  color: #1a1a2e;
}

.tgc-close-btn:hover {
  background: #fee2e2;
  color: #e63946;
}

/* ── Body ───────────────────────────────────────────────────────────────────── */
.tgc-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #fff;
}

/* ── Sidebar ────────────────────────────────────────────────────────────────── */
.tgc-sidebar {
  width: 290px;
  flex-shrink: 0;
  border-right: 1px solid #e8e9ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8f9fb;
}

.tgc-search-wrap {
  position: relative;
  padding: 10px 12px 8px;
  flex-shrink: 0;
  background: #f8f9fb;
}

.tgc-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 12px;
  pointer-events: none;
}

.tgc-search-input {
  width: 100%;
  background: #fff;
  border: 1px solid #dde0e8;
  border-radius: 20px;
  padding: 6px 28px 6px 30px;
  font-size: 13px;
  color: #1a1a2e;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.tgc-search-input:focus {
  border-color: #4361ee;
}

.tgc-search-clear {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
}

/* ── Folder tabs ────────────────────────────────────────────────────────────── */
.tgc-folder-tabs-wrap {
  position: relative;
  flex-shrink: 0;
}

/* Fade-out on the right to hint at hidden tabs */
.tgc-folder-tabs-wrap::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 8px;
  width: 24px;
  background: linear-gradient(to right, transparent, #f8f9fb);
  pointer-events: none;
}

.tgc-folder-tabs {
  display: flex;
  gap: 6px;
  padding: 0 12px 8px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #dde0e8 transparent;
  flex-shrink: 0;
}

.tgc-folder-tabs::-webkit-scrollbar {
  height: 3px;
}

.tgc-folder-tabs::-webkit-scrollbar-thumb {
  background: #dde0e8;
  border-radius: 2px;
}

.tgc-folder-tab {
  background: none;
  border: 1px solid #dde0e8;
  border-radius: 16px;
  padding: 3px 12px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.tgc-folder-tab:hover {
  background: #eef0f6;
}

.tgc-folder-tab.active {
  background: #4361ee;
  border-color: #4361ee;
  color: #fff;
  font-weight: 500;
}

.tgc-dialog-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tgc-dialog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 60px;
}

.tgc-dialog-item:hover {
  background: #eef0f6;
}

.tgc-dialog-item.active {
  background: #dce3ff;
}

.tgc-dialog-info {
  flex: 1;
  min-width: 0;
}

.tgc-dialog-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
}

.tgc-dialog-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1a1a2e;
  flex: 1;
  min-width: 0;
}

.tgc-dialog-time {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.tgc-dialog-preview {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.tgc-unread-badge {
  background: #4361ee;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 6px;
  flex-shrink: 0;
}

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
.tgc-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
  color: #fff;
}

.tgc-avatar-sm {
  width: 34px;
  height: 34px;
  font-size: 14px;
}

.tgc-avatar-user {
  background: #4a90e2;
}
.tgc-avatar-bot {
  background: #7c4dff;
}
.tgc-avatar-group {
  background: #26a69a;
}
.tgc-avatar-channel {
  background: #ef6c00;
}

/* ── Chat panel ─────────────────────────────────────────────────────────────── */
.tgc-chat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.tgc-chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid #e8e9ed;
  flex-shrink: 0;
  background: #fff;
}

.tgc-chat-title-wrap {
  min-width: 0;
}

.tgc-chat-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1a1a2e;
}

.tgc-chat-sub {
  font-size: 12px;
  color: #999;
}

.tgc-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #f5f7fb;
}

/* ── Messages ───────────────────────────────────────────────────────────────── */
.tgc-date-sep {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 12px 0 6px;
  position: relative;
}

.tgc-date-sep::before,
.tgc-date-sep::after {
  content: "";
  position: absolute;
  top: 50%;
  width: calc(50% - 70px);
  height: 1px;
  background: #dde0e8;
}

.tgc-date-sep::before {
  left: 0;
}
.tgc-date-sep::after {
  right: 0;
}

.tgc-msg-wrap {
  display: flex;
  margin: 2px 0;
}

.tgc-msg-in {
  justify-content: flex-start;
}

.tgc-msg-out {
  justify-content: flex-end;
}

.tgc-msg-bubble {
  max-width: 68%;
  min-width: 80px;
  padding: 7px 10px 5px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.tgc-msg-in .tgc-msg-bubble {
  background: #fff;
  border: 1px solid #e8e9ed;
  border-bottom-left-radius: 4px;
  color: #1a1a2e;
}

.tgc-msg-out .tgc-msg-bubble {
  background: #4361ee;
  border-bottom-right-radius: 4px;
  color: #fff;
}

.tgc-msg-sender {
  font-size: 12px;
  font-weight: 600;
  color: #4361ee;
  margin-bottom: 2px;
}

.tgc-msg-out .tgc-msg-sender {
  color: rgba(255, 255, 255, 0.85);
}

.tgc-msg-text {
  white-space: pre-wrap;
}

.tgc-msg-doc {
  color: #999;
  font-style: italic;
  font-size: 13px;
}

.tgc-msg-photo {
  max-width: 260px;
  max-height: 300px;
  border-radius: 8px;
  display: block;
  margin-bottom: 4px;
}

.tgc-msg-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 3px;
}

.tgc-msg-time {
  font-size: 11px;
  color: #bbb;
}

.tgc-msg-out .tgc-msg-time {
  color: rgba(255, 255, 255, 0.65);
}

.tgc-msg-tick {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
}

.tgc-msg-buttons {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tgc-btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tgc-btn-chip {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: inherit;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.tgc-btn-chip:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.tgc-btn-chip:disabled {
  opacity: 0.55;
  cursor: default;
}

.tgc-btn-chip.tgc-btn-loading {
  opacity: 0.6;
  cursor: wait;
}

.tgc-msg-in .tgc-btn-chip {
  background: #eef1fb;
  border-color: #d0d4e8;
  color: #4361ee;
}

.tgc-msg-in .tgc-btn-chip:hover:not(:disabled) {
  background: #e0e4f7;
}

/* ── Compose ────────────────────────────────────────────────────────────────── */
.tgc-compose {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e8e9ed;
  flex-shrink: 0;
  background: #fff;
}

.tgc-input {
  flex: 1;
  background: #f5f6fa;
  border: 1px solid #dde0e8;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 14px;
  color: #1a1a2e;
  resize: none;
  outline: none;
  min-height: 38px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  transition: border-color 0.15s;
  font-family: inherit;
}

.tgc-input:focus {
  border-color: #4361ee;
  background: #fff;
}

.tgc-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #4361ee;
  border: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    opacity 0.15s,
    transform 0.1s;
}

.tgc-send-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.tgc-send-btn:not(:disabled):hover {
  opacity: 0.85;
}

.tgc-send-btn:not(:disabled):active {
  transform: scale(0.93);
}

/* ── Empty states ───────────────────────────────────────────────────────────── */
.tgc-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bbb;
  gap: 12px;
  font-size: 14px;
  background: #f5f7fb;
}

.tgc-empty-list,
.tgc-empty-chat {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  padding: 24px 16px;
}

.tgc-list-error {
  color: #e63946;
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.tgc-spinner-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.tgc-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid #e0e0e8;
  border-top-color: #4361ee;
  border-radius: 50%;
  animation: tgc-spin 0.7s linear infinite;
}

@keyframes tgc-spin {
  to {
    transform: rotate(360deg);
  }
}

.tgc-load-more {
  display: flex;
  justify-content: center;
  padding: 8px;
}

.tgc-load-more-btn {
  background: none;
  border: 1px solid #dde0e8;
  color: #4361ee;
  border-radius: 16px;
  padding: 4px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.tgc-load-more-btn:hover {
  background: #f0f2f5;
}

/* ── Contacts overlay ───────────────────────────────────────────────────────── */
.tgc-contacts-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 10;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  border-radius: 12px;
  overflow: hidden;
}

.tgc-contacts-panel {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e8e9ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tgc-contacts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e9ed;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
  color: #1a1a2e;
}

.tgc-contacts-search {
  position: relative;
  padding: 8px 12px;
  flex-shrink: 0;
}

.tgc-contacts-search .tgc-search-icon {
  top: 50%;
}

.tgc-contacts-search .tgc-search-input {
  padding-left: 30px;
}

.tgc-contact-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tgc-contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.tgc-contact-item:hover {
  background: #f0f2f5;
}

.tgc-contact-info {
  min-width: 0;
}

.tgc-contact-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tgc-contact-sub {
  font-size: 12px;
  color: #999;
}

.tgc-add-contact {
  border-top: 1px solid #e8e9ed;
  padding: 12px 14px;
  flex-shrink: 0;
}

.tgc-add-contact-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tgc-add-contact-fields {
  display: flex;
  gap: 6px;
}

.tgc-add-contact-fields .form-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  padding: 5px 8px;
}

.tgc-add-contact-fields .btn {
  flex-shrink: 0;
  padding: 5px 12px;
  font-size: 13px;
}

/* ── Avatar photo overlay ───────────────────────────────────────────────────── */
.tgc-avatar {
  position: relative;
  overflow: hidden;
}

.tgc-avatar-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* ── Clickable header elements ──────────────────────────────────────────────── */
.tgc-clickable {
  cursor: pointer;
}

.tgc-chat-title-wrap.tgc-clickable:hover .tgc-chat-name {
  color: #4361ee;
}

/* ── Profile panel ──────────────────────────────────────────────────────────── */
.tgc-profile-panel {
  width: 300px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #e8e9ed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  animation: tgc-slide-right 0.18s ease;
}

@keyframes tgc-slide-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.tgc-profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid #e8e9ed;
  flex-shrink: 0;
}

.tgc-profile-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.tgc-profile-body {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tgc-profile-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 16px;
  border-bottom: 1px solid #f0f2f5;
}

.tgc-profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
}

.tgc-profile-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a2e;
  text-align: center;
  word-break: break-word;
}

.tgc-profile-type-badge {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
  text-transform: capitalize;
}

.tgc-profile-rows {
  padding: 8px 0;
}

.tgc-profile-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 52px;
}

.tgc-profile-row:hover {
  background: #f5f6fa;
}

.tgc-profile-row-nocopy {
  cursor: default;
}

.tgc-profile-row-nocopy:hover {
  background: none;
}

.tgc-profile-row-icon {
  color: #4361ee;
  font-size: 16px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.tgc-profile-row-body {
  flex: 1;
  min-width: 0;
}

.tgc-profile-row-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 1px;
}

.tgc-profile-row-value {
  font-size: 14px;
  color: #1a1a2e;
  word-break: break-word;
}

.tgc-bio-text {
  white-space: pre-wrap;
  font-size: 13px;
  color: #444;
  line-height: 1.5;
}

.tgc-copy-icon {
  color: #bbb;
  font-size: 13px;
  flex-shrink: 0;
  transition: color 0.1s;
}

.tgc-profile-row:hover .tgc-copy-icon {
  color: #4361ee;
}

/* ── Copy toast ─────────────────────────────────────────────────────────────── */
.tgc-copy-toast {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.85);
  color: #fff;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 20px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  animation: tgc-fade-in 0.15s ease;
}

@keyframes tgc-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ── Context menu ───────────────────────────────────────────────────────────── */
.tgc-ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.tgc-ctx-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8e9ed;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 51;
  min-width: 180px;
  padding: 4px 0;
  animation: tgc-fade-in 0.1s ease;
}

.tgc-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  padding: 9px 14px;
  font-size: 14px;
  color: #1a1a2e;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.tgc-ctx-item:hover {
  background: #f0f2f5;
}

.tgc-ctx-item i {
  width: 16px;
  text-align: center;
  color: #666;
}

.tgc-ctx-divider {
  height: 1px;
  background: #e8e9ed;
  margin: 4px 0;
}

/* ── Back button (mobile only) ──────────────────────────────────────────────── */
.tgc-back-btn {
  display: none;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 16px;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.tgc-back-btn:hover {
  background: #f0f2f5;
  color: #1a1a2e;
}

/* ── Responsive ─────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .tgc-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .tgc-popup {
    height: 100dvh;
    height: 100vh; /* fallback for browsers without dvh */
    max-height: none;
    border-radius: 0;
    width: 100%;
  }

  /* Single-panel: sidebar fills the body */
  .tgc-sidebar {
    width: 100%;
    flex-shrink: 0;
    border-right: none;
  }

  /* Chat panel hidden until a chat is opened */
  .tgc-chat {
    display: none;
    width: 100%;
  }

  /* When a chat is open: hide sidebar, show chat */
  .tgc-body.chat-open .tgc-sidebar {
    display: none;
  }

  .tgc-body.chat-open .tgc-chat {
    display: flex;
  }

  /* Empty state stays hidden when sidebar is showing */
  .tgc-empty-state {
    display: none;
  }

  .tgc-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Contacts panel full-width on mobile */
  .tgc-contacts-panel {
    width: 100%;
    border-left: none;
  }
  /* Profile panel overlays the chat on mobile */
  .tgc-profile-panel {
    position: absolute;
    inset: 0;
    width: 100%;
    z-index: 20;
    border-left: none;
  }

  /* Tighten up message bubbles on narrow screens */
  .tgc-msg-bubble {
    max-width: 85%;
  }

  .tgc-messages {
    padding: 12px;
  }

  /* Header: collapse logo + title; let the account select fill available space */
  .tgc-logo,
  .tgc-title {
    display: none;
  }

  .tgc-header-left {
    flex: 1;
    min-width: 0;
  }

  .tgc-account-select {
    flex: 1;
    max-width: none;
    min-width: 0;
    font-size: 14px;
    padding: 5px 8px;
  }
}
</style>
