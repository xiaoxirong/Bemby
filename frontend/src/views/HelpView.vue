<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ locale === 'zh' ? '帮助' : 'Help' }}</h2>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;max-width:740px">

      <!-- Overview -->
      <div class="card">
        <div class="card-body">
          <template v-if="locale === 'zh'">
            <div class="card-section-title">概览</div>
            <p class="help-para">
              Bemby 自动执行两类任务：Telegram 机器人签到（签到）和 Emby 视频观看会话。
              任务按照可配置的时间窗口每日定时运行。一般流程如下：
            </p>
            <ol class="help-steps">
              <li>在"账户"页面添加并认证一个 <strong>Telegram 账户</strong>。</li>
              <li>创建一个<strong>任务</strong>，关联该账户并配置运行计划。</li>
              <li>调度器每天在时间窗口内随机选择一个时间点自动执行任务。</li>
              <li>查看<strong>日志</strong>以确认结果或排查问题。</li>
            </ol>
          </template>
          <template v-else>
            <div class="card-section-title">Overview</div>
            <p class="help-para">
              Bemby automates two types of tasks: Telegram bot check-ins (签到) and Emby video-watch sessions.
              Jobs run on a daily schedule within a configurable time window. The general workflow is:
            </p>
            <ol class="help-steps">
              <li>Add and authenticate a <strong>Telegram account</strong> under Accounts.</li>
              <li>Create a <strong>Job</strong>, link it to that account, and configure its schedule.</li>
              <li>The scheduler picks a random time within the window each day and runs the job automatically.</li>
              <li>Check <strong>Logs</strong> to verify results or diagnose failures.</li>
            </ol>
          </template>
        </div>
      </div>

      <!-- Accounts -->
      <div class="card">
        <div class="card-body">
          <template v-if="locale === 'zh'">
            <div class="card-section-title">账户</div>
            <p class="help-para">账户代表 Telegram 用户会话。每个签到任务需要一个已认证的账户。</p>
            <table class="help-table">
              <tr><td>API ID / API Hash</td><td>在 <code>my.telegram.org</code> 的"API development tools"中获取。</td></tr>
              <tr><td>发送验证码</td><td>通过 Telegram 向账户手机号发送登录验证码。</td></tr>
              <tr><td>验证</td><td>输入收到的验证码。若启用了二步验证，请在提示时输入 2FA 密码。</td></tr>
            </table>
            <div class="help-badges-row">
              <span class="badge badge-grey">未认证</span>
              <span class="badge badge-orange">等待验证码 / 二步验证</span>
              <span class="badge badge-green">已认证</span>
            </div>
            <p class="help-note">只有已认证的账户才能运行签到任务。</p>
          </template>
          <template v-else>
            <div class="card-section-title">Accounts</div>
            <p class="help-para">Accounts represent Telegram user sessions. Each job requires one authenticated account.</p>
            <table class="help-table">
              <tr><td>API ID / API Hash</td><td>Obtain from <code>my.telegram.org</code> under "API development tools".</td></tr>
              <tr><td>Request Code</td><td>Sends a login code to the account's phone number via Telegram.</td></tr>
              <tr><td>Verify</td><td>Enter the code received. If two-factor auth is enabled, enter the 2FA password when prompted.</td></tr>
            </table>
            <div class="help-badges-row">
              <span class="badge badge-grey">Unauthenticated</span>
              <span class="badge badge-orange">Pending code / 2FA</span>
              <span class="badge badge-green">Authenticated</span>
            </div>
            <p class="help-note">Only authenticated accounts can run check-in jobs.</p>
          </template>
        </div>
      </div>

      <!-- Jobs -->
      <div class="card">
        <div class="card-body">
          <template v-if="locale === 'zh'">
            <div class="card-section-title">任务</div>
            <p class="help-para">支持两种任务类型：</p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">签到（Check-in）</div>
            <p class="help-para">
              向 Telegram 机器人发送命令并点击回复键盘上的按钮，完成每日签到。
              <strong>机器人用户名</strong>字段接受带或不带 <code>@</code> 前缀的机器人账号。
            </p>
            <table class="help-table">
              <tr><td>启动命令</td><td>发送给机器人的命令，默认 <code>/start</code>。支持模板占位符，留空则使用默认值。</td></tr>
              <tr><td>签到按钮文字</td><td>用于在机器人回复的内联键盘中匹配按钮的文字，默认 <code>签到</code>。</td></tr>
            </table>
            <p class="help-para"><strong>命令模板占位符</strong>——可在启动命令中嵌入动态内容，每次执行时随机生成：</p>
            <table class="help-table">
              <tr><td><code>{word}</code> / <code>{word:N}</code></td><td>N 位随机小写字母（默认 6 位）</td></tr>
              <tr><td><code>{WORD}</code> / <code>{WORD:N}</code></td><td>N 位随机大写字母（默认 6 位）</td></tr>
              <tr><td><code>{num}</code> / <code>{num:N}</code></td><td>N 位随机数字（默认 6 位）</td></tr>
              <tr><td><code>{alpha}</code> / <code>{alpha:N}</code></td><td>N 位随机大小写字母与数字混合（默认 8 位）</td></tr>
              <tr><td><code>{uuid}</code></td><td>随机 UUID v4</td></tr>
            </table>
            <p class="help-note">示例：<code>/create {word:4}-{num:6}</code> 发送时会变成 <code>/create abcd-829341</code></p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">观看（Emby Watch）</div>
            <p class="help-para">
              在 Emby 服务器上模拟视频播放会话：随机选择一部影片或剧集，每 30 秒上报进度，
              然后将会话标记为已停止。可用于保持 Emby 账户活跃。
            </p>
            <table class="help-table">
              <tr><td>服务器地址</td><td>Emby 服务器完整地址，如 <code>https://emby.example.com:443</code>。粘贴含协议和端口的完整 URL 时会自动解析并填充各字段。</td></tr>
              <tr><td>Emby 用户名 / 密码</td><td>用于登录 Emby 账户的凭据。</td></tr>
              <tr><td>播放时长</td><td>模拟播放的秒数。留空使用系统默认值。</td></tr>
              <tr><td>用户代理</td><td>发送给 Emby 的 UA 字符串。留空使用系统默认值。</td></tr>
            </table>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">时间窗口</div>
            <p class="help-para">
              任务每天在<strong>开始时间</strong>与<strong>结束时间</strong>（均为 HHMM 格式，如 <code>1400</code> 表示 14:00）之间随机一个时间点运行一次。
              若当前时间已在窗口内，则在剩余窗口时间内调度；若窗口已过，则安排在次日执行。
            </p>
            <p class="help-note">
              在设置中关闭<em>每天仅运行一次</em>，可让调度器对今天已运行过的任务重新触发，便于测试。
            </p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">启用 / 禁用</div>
            <p class="help-para">
              点击任务列表中<strong>启用</strong>列的状态标签，可直接切换任务的启用状态，无需打开编辑表单。
              禁用任务时会弹出确认框；重新启用时无需确认。
            </p>
          </template>
          <template v-else>
            <div class="card-section-title">Jobs</div>
            <p class="help-para">Two job types are supported:</p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">Check-in (签到)</div>
            <p class="help-para">
              Sends a command to a Telegram bot and clicks the reply keyboard button to perform a daily check-in.
              The <strong>Bot Username</strong> field accepts the bot handle with or without the leading <code>@</code>.
            </p>
            <table class="help-table">
              <tr><td>Start Command</td><td>Command sent to the bot, default <code>/start</code>. Supports template placeholders. Leave blank to use the default.</td></tr>
              <tr><td>Check-in Button</td><td>Text used to match the inline keyboard button, default <code>签到</code>.</td></tr>
            </table>
            <p class="help-para"><strong>Command template placeholders</strong> — embed dynamic content that is randomly generated each run:</p>
            <table class="help-table">
              <tr><td><code>{word}</code> / <code>{word:N}</code></td><td>N random lowercase letters (default 6)</td></tr>
              <tr><td><code>{WORD}</code> / <code>{WORD:N}</code></td><td>N random uppercase letters (default 6)</td></tr>
              <tr><td><code>{num}</code> / <code>{num:N}</code></td><td>N random digits (default 6)</td></tr>
              <tr><td><code>{alpha}</code> / <code>{alpha:N}</code></td><td>N random mixed-case alphanumeric characters (default 8)</td></tr>
              <tr><td><code>{uuid}</code></td><td>Random UUID v4</td></tr>
            </table>
            <p class="help-note">Example: <code>/create {word:4}-{num:6}</code> sends as <code>/create abcd-829341</code></p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">Emby Watch (观看)</div>
            <p class="help-para">
              Simulates a video playback session on an Emby server. Picks a random movie or episode, reports
              progress every 30 seconds, then marks the session as stopped. Useful for keeping Emby accounts active.
            </p>
            <table class="help-table">
              <tr><td>Server URL</td><td>Full address of the Emby server, e.g. <code>https://emby.example.com:443</code>. Paste a URL with protocol and port and the fields are auto-filled.</td></tr>
              <tr><td>Emby Username / Password</td><td>Credentials for the Emby account to log in as.</td></tr>
              <tr><td>Play Duration</td><td>Seconds to simulate playback. Blank uses the system default.</td></tr>
              <tr><td>User Agent</td><td>Browser UA string sent to Emby. Blank uses the system default.</td></tr>
            </table>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">Schedule Window</div>
            <p class="help-para">
              Jobs run once per day at a random time between <strong>Window Start</strong> and <strong>Window End</strong>
              (both in HHMM format, e.g. <code>1400</code> = 2:00 pm). If the current time is already inside the window,
              the job is scheduled within the remaining window time today. If the window has passed, it is scheduled for
              tomorrow.
            </p>
            <p class="help-note">
              Disable <em>Enforce one run per day</em> in Settings to allow the scheduler to re-trigger jobs that have
              already run today -- useful for testing.
            </p>

            <div class="card-section-title" style="margin-top:16px;font-size:11px">Enable / Disable</div>
            <p class="help-para">
              Click the status badge in the <strong>Enabled</strong> column to toggle a job on or off without opening the edit form.
              Disabling a job requires confirmation; re-enabling is immediate.
            </p>
          </template>
        </div>
      </div>

      <!-- Settings -->
      <div class="card">
        <div class="card-body">
          <template v-if="locale === 'zh'">
            <div class="card-section-title">设置</div>
            <table class="help-table">
              <tr><td>默认时区</td><td>用于计算所有任务的时间窗口。</td></tr>
              <tr><td>默认最大重试次数</td><td>任务失败后的重试次数。</td></tr>
              <tr><td>每天仅运行一次</td><td>防止任务在 24 小时内重复运行。测试时可关闭。</td></tr>
              <tr><td>默认播放时长</td><td>未在任务中单独设置时，Emby 观看会话的默认时长（秒）。</td></tr>
              <tr><td>设备名称</td><td>发送给 Emby API 的设备标识（如 <code>Mac</code>），Emby 会在客户端旁显示该名称。</td></tr>
              <tr><td>默认用户代理</td><td>未在任务中单独设置时，Emby 观看请求使用的默认 UA 字符串。</td></tr>
            </table>
            <p class="help-para" style="margin-top:14px">
              <strong>管理员凭据</strong> -- 随时更改管理员用户名或密码，确认更改时需输入当前密码。
            </p>
          </template>
          <template v-else>
            <div class="card-section-title">Settings</div>
            <table class="help-table">
              <tr><td>Default Timezone</td><td>Used when calculating schedule windows for all jobs.</td></tr>
              <tr><td>Default Max Retries</td><td>How many times a failed job attempt is retried.</td></tr>
              <tr><td>Enforce one run per day</td><td>Prevents a job from running more than once in a 24-hour period. Disable during testing.</td></tr>
              <tr><td>Default Play Duration</td><td>Fallback Emby Watch session length in seconds when not set per-job.</td></tr>
              <tr><td>Device Name</td><td>Device identifier sent to the Emby API (e.g. <code>Mac</code>). Emby displays this alongside the client name.</td></tr>
              <tr><td>Default User Agent</td><td>Fallback UA string for Emby Watch requests when not set per-job.</td></tr>
            </table>
            <p class="help-para" style="margin-top:14px">
              <strong>Admin Credentials</strong> -- change the admin username or password at any time.
              Current password is always required to confirm the change.
            </p>
          </template>
        </div>
      </div>

      <!-- Logs -->
      <div class="card">
        <div class="card-body">
          <template v-if="locale === 'zh'">
            <div class="card-section-title">日志</div>
            <p class="help-para">
              每次任务执行均记录时间戳、状态和消息。
              使用顶部的任务筛选器缩小显示范围。
            </p>
            <div class="help-badges-row">
              <span class="badge badge-green">成功</span>
              <span class="badge badge-red">失败</span>
              <span class="badge badge-orange">运行中</span>
            </div>
            <p class="help-para" style="margin-top:10px"><strong>签到任务详情</strong></p>
            <p class="help-para">
              点击任意签到日志行可展开仿 Telegram 气泡样式的对话详情，显示完整的交互过程：
            </p>
            <ol class="help-steps">
              <li>右侧绿色气泡显示发送的命令（含模板展开后的实际内容）。</li>
              <li>左侧灰色气泡显示机器人回复（图片、文字、网页预览）及内联键盘，已点击的按钮以绿色高亮。</li>
              <li>右侧绿色气泡显示实际点击的按钮文字。</li>
              <li>若机器人在按钮点击后更新了消息，左侧会再显示一个更新后的气泡。</li>
              <li>若有多次重试，每次尝试均单独展示。</li>
            </ol>
            <p class="help-note">
              对于状态为<strong>运行中</strong>的任务，详情面板每 2 秒自动刷新。
              可点击消息列的<strong>停止</strong>按钮随时中止正在运行的签到任务。
            </p>
          </template>
          <template v-else>
            <div class="card-section-title">Logs</div>
            <p class="help-para">
              Every job execution is recorded with a timestamp, status, and message.
              Use the job filter at the top to narrow results to a specific job.
            </p>
            <div class="help-badges-row">
              <span class="badge badge-green">Success</span>
              <span class="badge badge-red">Failed</span>
              <span class="badge badge-orange">Running</span>
            </div>
            <p class="help-para" style="margin-top:10px"><strong>Check-in detail view</strong></p>
            <p class="help-para">
              Click any check-in log row to expand a Telegram-style chat view showing the full interaction:
            </p>
            <ol class="help-steps">
              <li>A green bubble on the right shows the command that was sent (with any template placeholders already expanded).</li>
              <li>A grey bubble on the left shows the bot's reply — photo, text, web preview — with the inline keyboard below it. The clicked button is highlighted green.</li>
              <li>A green bubble on the right shows which button was clicked.</li>
              <li>If the bot edited its message after the button click, the updated content appears as a second grey bubble on the left.</li>
              <li>If the job retried, each attempt is shown separately.</li>
            </ol>
            <p class="help-note">
              While a job is <strong>Running</strong>, the detail panel refreshes automatically every 2 seconds.
              Click the <strong>Stop</strong> button in the message column to cancel a running check-in at any time.
            </p>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { locale } from '../i18n';
</script>

<style scoped>
.help-para {
  color: #555;
  line-height: 1.7;
  margin-bottom: 10px;
}

.help-steps {
  color: #555;
  line-height: 1.9;
  padding-left: 20px;
  margin-top: 10px;
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.help-table td {
  padding: 7px 10px;
  vertical-align: top;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.help-table td:first-child {
  font-weight: 600;
  width: 180px;
  color: #222;
  white-space: nowrap;
}

.help-badges-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0;
}

.help-note {
  font-size: 12px;
  color: #888;
  line-height: 1.6;
  margin-top: 6px;
}

code {
  font-family: 'SFMono-Regular', Consolas, monospace;
  background: #f0f2f5;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
