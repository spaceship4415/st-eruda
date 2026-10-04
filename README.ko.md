# Eruda 모바일 콘솔 사용 가이드

[English](README.md)

휴대폰에서도 PC 개발자도구처럼 **콘솔·에러·네트워크**를 볼 수 있게 해 주는 확장입니다.
[Eruda](https://github.com/liriliri/eruda)라는 휴대폰 브라우저용 개발자도구를 켜고 끄는 토글을 달아 줍니다.

---

## 1. 켜기

1. **확장 → Eruda 모바일 콘솔**을 엽니다.
2. **디버그 콘솔 켜기**에 체크합니다.
3. 화면에 톱니 버튼이 생깁니다. 누르면 콘솔이 열리고, 한 번 더 누르면 닫힙니다.

켜 두면 새로고침해도 계속 뜹니다. 체크를 풀면 바로 사라집니다.
처음 켤 때 Eruda를 인터넷(jsDelivr)에서 받아오기 때문에 인터넷 연결이 필요합니다.

## 2. 버튼 위치

**버튼 위치**에서 톱니 버튼 자리를 고를 수 있습니다. 왼쪽·오른쪽과 위·가운데·아래를 조합한 6곳 중 하나입니다.
기본값은 **오른쪽 가운데**로, 한 손으로 잡았을 때 엄지가 닿기 쉬운 자리입니다.
위나 아래를 골라도 ST 위쪽 메뉴줄과 아래쪽 입력창에는 겹치지 않게 띄워 둡니다.

## 3. 창이 닫혀 있어도 기록됩니다

켜 두기만 하면 Eruda 창이 닫혀 있어도 아래 내용이 계속 쌓입니다.

- 로그, 경고, 에러 (확장이 남기는 기록과 빨간 에러)
- 잡히지 않은 에러 (버튼을 눌렀는데 반응이 없을 때 원인이 여기 남는 경우가 많습니다)
- 네트워크 요청 (API 호출이 실패했는지, 서버가 어떤 응답을 줬는지)

**추천하는 사용 순서**

1. 기능을 켜 둡니다.
2. 평소처럼 쓰다가 문제가 생기면 **그 자리에서** 톱니를 누릅니다.
3. Console 탭 위쪽의 **Error**를 누르면 에러만 모아서 볼 수 있습니다.
4. 그 화면을 캡처해서 공유하면 원인을 찾기 쉽습니다.

**주의할 점**

- **새로고침하면 기록이 다 지워집니다.** 문제가 생기면 새로고침하기 전에 먼저 확인하세요.
- 이 확장을 가장 먼저 불러오게 해 두어서 대부분은 잡힙니다. 다만 ST가 맨 처음 로딩될 때의 일부는 빠질 수 있습니다.

## 4. 에러 내보내기

Eruda 콘솔에서는 로그를 한 줄씩만 복사할 수 있어서, 한꺼번에 내보내는 **내보내기** 탭을 따로 달아 두었습니다.

1. 톱니를 눌러 Eruda를 열고, 위쪽 탭 줄에서 **내보내기**를 누릅니다.
2. **무엇을 내보낼까요?**에서 하나를 고릅니다. 고른 것은 기억해 둡니다.
   - **에러·경고만** (기본값): 문제 되는 줄만 모읍니다. 보통은 이걸로 충분합니다.
   - **전체**: 일반 로그까지 전부 모읍니다.
   - **콘솔에 보이는 그대로**: Console 탭에서 걸어 둔 필터를 그대로 따릅니다.
     위쪽의 종류(All/Info/Warning/Error)와 깔때기 아이콘으로 넣은 검색어가 둘 다 적용되고, 검색어는 대소문자를 가리지 않습니다.
     이 선택지 아래에 지금 걸린 필터가 보입니다(예: `지금 콘솔 필터: Error · "nanogpt"`). 필터가 없으면 **전체**와 같습니다.
3. 위쪽의 **내보낼 줄 N개**에서 몇 줄이 들어갈지 미리 볼 수 있습니다.
4. 버튼을 누릅니다. 둘 다 위에서 고른 것을 따릅니다.
   - **복사**: 클립보드에 복사합니다. 채팅이나 이슈 글에 그대로 붙여넣으면 됩니다.
   - **파일로 저장 (.txt)**: 파일로 내려받습니다. 기록이 길어서 붙여넣기 어려울 때 쓰세요.
     파일 이름은 고른 것에 따라 `st-console-errors-날짜-시간.txt`(에러·경고만), `st-console-날짜-시간.txt`(전체), `st-console-filtered-날짜-시간.txt`(콘솔에 보이는 그대로)입니다.

내보낸 내용에는 줄마다 시간·종류(ERROR/WARN 등)·내용이 들어가고, 에러는 어느 파일 몇 번째 줄에서 났는지(스택)까지 함께 들어갑니다.
맨 위에는 브라우저 정보, 화면 크기, 그리고 무엇을 골라 내보낸 기록인지(콘솔 필터를 따랐다면 그 필터까지)도 적힙니다.

공유해도 안전하도록 아래 내용은 자동으로 가려집니다.

| 가리는 것 | 예 | 바뀐 모습 |
|---|---|---|
| ST에 접속한 주소 | `http://192.168.0.5:8000/scripts/a.js` | `<ST>/scripts/a.js` (주소만 나오면 `<host>`) |
| 그 밖의 IP 주소 | `http://192.168.0.10:5000`, `[fe80::1]` | `http://<ip>:5000`, `[<ip>]` |
| API 키·토큰 | `sk-...`, `AIza...`, `ghp_...`, `hf_...`, JWT | `<secret>` |
| 인증 헤더 | `Authorization: Bearer xxx` | `Authorization: Bearer <secret>` |
| 주소 속 키 | `?key=xxx`, `&token=xxx` | `?key=<secret>` |
| 키 이름이 붙은 값 | `"api_key": "xxx"`, `password=xxx` | `"api_key": "<secret>"` |

- `127.0.0.1`, `0.0.0.0`처럼 누구에게나 같은 주소는 그대로 둡니다. `Chrome/154.0.0.0` 같은 버전 번호도 IP로 보지 않습니다.
- 키 이름은 남겨서, 거기에 무언가 있었다는 것은 알 수 있게 했습니다.
- **채팅 내용은 자동으로 가릴 수 없습니다.** ST 설정의 "콘솔에 프롬프트 기록"이 켜진 상태에서 **전체**나 **콘솔에 보이는 그대로**를 고르면, 채팅 내용이 들어갈 수 있다는 경고가 뜹니다. 공유할 때는 **에러·경고만**이 가장 안전합니다.
- 자동 가리기는 흔한 형태만 잡습니다. 공유하기 전에 한 번 훑어보세요.

- 이 확장을 켠 뒤로 쌓인 기록만 들어갑니다. 새로고침하면 지워집니다.
- 기록은 최근 2000줄까지만 보관합니다.
- 브라우저가 클립보드 권한을 막아 두면 복사가 실패할 수 있습니다. 그때는 **파일로 저장**을 쓰세요.

## 5. 자바스크립트 입력하기

1. 톱니를 눌러 Eruda를 열고 **Console** 탭을 고릅니다.
2. 맨 아래 `>` 표시가 있는 줄을 누릅니다. 키보드가 올라옵니다.
3. 코드를 입력하거나 붙여넣고 **Execute** 버튼을 누릅니다.
   키보드의 엔터(전송)는 줄바꿈이 될 수 있으니 이 버튼을 누르는 게 확실합니다.
4. 결과는 바로 위 로그에 이어서 찍힙니다. 객체 앞의 `▶`를 누르면 안쪽 내용을 펼쳐 볼 수 있습니다.

PC 개발자도구 콘솔과 똑같이 현재 ST 페이지 안에서 실행됩니다. 그래서 PC에서 쓰던 디버깅 코드를 그대로 붙여넣으면 됩니다.

예시 (마지막 메시지 원본 보기):

```js
SillyTavern.getContext().chat.at(-1)
```

## 6. 스니펫: 자주 쓰는 코드를 등록해 두고 한 번에 실행

휴대폰에서 긴 코드를 매번 붙여넣기는 번거로워서 **스니펫** 탭을 두었습니다.

1. Eruda를 열고 탭 줄에서 **스니펫**을 누릅니다.
2. **+ 새 스니펫**을 눌러 이름과 코드를 넣고 **저장**합니다.
3. 목록에서 **▶ 실행**을 누르면 실행됩니다. 결과는 **Console** 탭에 찍힙니다.
4. **수정**으로 고치고, **삭제**는 한 번 더 눌러야(“정말 삭제?”) 지워집니다.

- 콘솔에 넣는 것과 똑같이 실행되고, 맨 바깥에 `await`를 써도 됩니다.
- 저장할 때 둥근 따옴표(`“ ” ‘ ’`)를 곧은 따옴표로 바꿔 줍니다. 휴대폰 키보드 때문에 코드가 깨지지 않게 하려는 것입니다.
- ST 서버에 저장되므로 **PC에서 등록하면 휴대폰에서도 보입니다.** 긴 코드는 PC에서 넣어 두면 편합니다.

## 7. 자주 쓰는 코드

스니펫에 등록하거나 Console에 붙여넣어 쓰세요. 감시·기록 코드는 **새로고침하면 꺼집니다.**

### 지금 상태 한눈에 보기
```js
(() => {
  const c = SillyTavern.getContext();
  const s = c.chatCompletionSettings;
  console.table({
    API: c.mainApi, 소스: s.chat_completion_source, 모델: c.getChatCompletionModel?.(),
    프리셋: s.preset_settings_openai, 최대응답: s.openai_max_tokens, 컨텍스트: s.openai_max_context,
    캐릭터: c.name2, 채팅: c.getCurrentChatId(), 메시지수: c.chat.length,
  });
})();
```

### 지금 쓰는 연결 프로필·프리셋
```js
(() => {
  const c = SillyTavern.getContext();
  const cm = c.extensionSettings.connectionManager;
  const p = cm?.profiles?.find(x => x.id === cm.selectedProfile);
  console.table({
    프로필: p?.name ?? '(선택 안 됨)',
    '프로필에 묶인 프리셋': p ? (p.preset ?? '(안 묶음)') : '-',
    '지금 프리셋': c.chatCompletionSettings.preset_settings_openai,
    API: c.chatCompletionSettings.chat_completion_source,
    모델: c.getChatCompletionModel?.(),
  });
})();
```

### 설치된 확장 목록·버전·켜짐 여부
```js
(async () => {
  const { extensionNames, getExtensionManifest, extension_settings } = await import('/scripts/extensions.js');
  const off = extension_settings.disabledExtensions || [];
  console.table(extensionNames.filter(n => n.startsWith('third-party')).map(n => ({
    확장: n.replace('third-party/', ''), 버전: getExtensionManifest(n)?.version ?? '', 상태: off.includes(n) ? '꺼짐' : '켜짐',
  })));
})();
```

### 실패한 요청 기록 (Termux 로그를 못 볼 때)
서버가 돌려준 에러 내용까지 콘솔에 찍습니다. 켜 두고 문제를 다시 일으킨 뒤 **내보내기** 하세요.
```js
(() => {
  const original = window.fetch;
  window.fetch = async (...args) => {
    const response = await original(...args);
    if (!response.ok) {
      const body = await response.clone().text().catch(() => '');
      console.error('[요청 실패]', response.status, String(args[0]), body.slice(0, 500));
    }
    return response;
  };
  toastr.info('실패한 요청 기록 시작');
})();
```

### 설정 값이 언제, 누구 때문에 바뀌는지 감시
값이 바뀌면 토스트가 뜨고, 콘솔에 **바꾼 코드의 위치**(스택)가 남습니다. 맨 아래 `watch(...)` 줄만 골라 쓰세요.
```js
(() => {
  const c = SillyTavern.getContext();
  const watch = (obj, key, label) => {
    let v = obj[key];
    Object.defineProperty(obj, key, {
      configurable: true, enumerable: true,
      get: () => v,
      set: (n) => {
        if (n !== v) {
          console.warn(`[감시] ${label}:`, v, '→', n, '\n' + new Error().stack);
          toastr.warning(`${v} → ${n}`, `${label} 바뀜`, { timeOut: 8000 });
        }
        v = n;
      },
    });
  };
  watch(c.chatCompletionSettings, 'preset_settings_openai', '프리셋');
  watch(c.chatCompletionSettings, 'openai_max_tokens', '최대 응답 길이');
  watch(c.chatCompletionSettings, 'openai_model', '모델');
  watch(c.extensionSettings.connectionManager, 'selectedProfile', '연결 프로필(id)');
  toastr.info('감시 시작');
})();
```

### 이 채팅의 답변을 무슨 모델로 받았는지
ST는 메시지마다 API와 모델만 남깁니다(프리셋·프로필 이름은 남기지 않습니다).
```js
console.table(SillyTavern.getContext().chat
  .map((m, i) => ({ 번호: i, 이름: m.name, API: m.extra?.api ?? '', 모델: m.extra?.model ?? '', 시간: m.send_date }))
  .filter(r => r.모델));
```

### 짧은 것들
| 하고 싶은 것 | 코드 |
|---|---|
| 마지막 메시지 원본 | `SillyTavern.getContext().chat.at(-1)` |
| 토큰 수 세기 | `await SillyTavern.getContext().getTokenCountAsync('세어볼 글')` |
| 채팅 메타데이터 | `SillyTavern.getContext().chatMetadata` |

이벤트 흐름은 코드 없이 볼 수 있습니다: ST 사용자 설정 → **디버그 메뉴** → *Toggle event tracing* → Execute (한 번 더 하면 꺼짐).

## 8. 휴대폰에서 코드 입력할 때 팁

- 휴대폰 키보드는 따옴표 `"`를 `“ ”` 같은 둥근 따옴표로 바꾸는 경우가 있습니다. 이러면 코드에 오류가 납니다.
  키보드 설정에서 **스마트 구두점(스마트 따옴표) 끄기**를 해 두면 편합니다. (스니펫은 저장할 때 알아서 고쳐 줍니다.)
- 긴 코드는 PC에서 스니펫으로 등록해 두거나, 다른 곳에서 복사해서 붙여넣는 게 편합니다.

## 9. 저장 위치와 삭제

설정과 스니펫은 ST의 `settings.json`이 아니라 이 확장 전용 파일에 저장됩니다.

- 위치: `data/<사용자>/user/files/st-eruda-settings.json`
- 예전 버전에서 `settings.json`에 저장된 값은 처음 실행할 때 이 파일로 옮기고 `settings.json`에서는 지웁니다.
- "콘솔을 켰는지"만은 기기마다 브라우저에도 적어 둡니다. 설정 파일을 받아 오기 전에 가장 먼저 로그를 모으기 시작하려는 것입니다.
- **확장을 삭제하면** 이 파일과 브라우저에 적어 둔 값, 예전 `settings.json` 항목까지 모두 지웁니다.

## 출처

[Eruda](https://github.com/liriliri/eruda) (만든 이: liriliri, MIT 라이선스). 이 확장에 Eruda 코드를 넣지 않았고, 콘솔을 켤 때 브라우저가 jsDelivr에서 직접 받아옵니다.
