# RACEMENT 해운대 재고조회시스템 — GitHub Pages 배포 가이드

매일 아침 점장이 엑셀을 한 번 업로드하면 → 모든 직원 기기(폰/태블릿/노트북)에서 동일한 URL로 실시간 재고 확인. 직원용 비밀번호로 외부 접근 차단.

---

## 0. 준비물

- GitHub 계정 (이미 있음 ✓)
- 이 폴더의 두 파일: **`index.html`**, **`app.js`**

---

## 1. 저장소(Repository) 만들기 — 5분

1. https://github.com/new 접속
2. **Repository name**: `stock-3f9a2b` 처럼 **추측하기 어려운 이름** 사용
   - 영문+숫자 조합, 6~10자 무작위 (예: `stock-h4ndR3`, `inv-rcm-x9k2p`)
   - ⚠️ `racement-stock` 같은 평범한 이름은 외부에서 추측 가능
3. **Public** 선택
4. "Add a README file" **체크 해제**
5. **Create repository** 클릭

---

## 2. 앱 파일 두 개 업로드

1. 저장소 페이지에서 **"uploading an existing file"** 링크 클릭
2. 이 폴더의 두 파일을 함께 드래그:
   - `index.html`
   - `app.js`
3. 아래 **Commit changes** 클릭

---

## 3. GitHub Pages 활성화

1. 저장소 상단 **Settings** 탭
2. 왼쪽 **Pages** 클릭
3. **Source**: Branch `main`, Folder `/ (root)`, **Save**
4. 1~2분 기다린 후 새로고침
5. 상단에 다음 URL이 표시됨:
   ```
   https://[GitHub사용자명].github.io/[저장소이름]/
   ```
   → 이게 직원들이 북마크할 URL입니다.

---

## 4. Personal Access Token (PAT) 생성 — 한 번만

업로드 권한을 위한 토큰입니다.

1. https://github.com/settings/tokens → **Generate new token** → **Generate new token (classic)**
2. **Note**: `Racement 재고 업로드`
3. **Expiration**: `No expiration` (또는 1년)
4. **Select scopes**: **`repo`** 전체 체크
5. 맨 아래 **Generate token** 클릭
6. 표시된 `ghp_xxxxxxxx...` 토큰을 **반드시 지금 복사** (다시 못 봄)

---

## 5. 앱 첫 설정

1. Pages URL 접속
2. 우측 상단 **ADMIN** → 비밀번호 `1212`
3. 첫 진입 시 **설정 패널** 자동 표시
4. 입력:
   - **GitHub 사용자명**: 본인 계정명
   - **저장소 이름**: 1번에서 만든 이름
   - **브랜치**: `main`
   - **PAT**: 4번에서 복사한 토큰 붙여넣기
5. **연결 테스트** → "✓ 연결 성공" 확인
6. **저장** → 업로드 화면으로 자동 전환
7. 엑셀 파일 드래그하여 첫 업로드

---

## 6. 직원용 비밀번호 설정

데이터 첫 업로드 후 비밀번호를 걸어주세요.

1. ADMIN → 우측 상단 **설정** 버튼
2. 하단 **직원용 비밀번호** 칸에 비밀번호 입력 (예: `racement2026`)
3. **적용** 클릭 → "비밀번호 적용 완료" 확인
4. 직원들에게 비밀번호 공유

직원 첫 접속 시:
- URL 접속 → 로그인 화면 표시
- 비밀번호 입력 → "이 기기 기억하기" 체크 → 통과
- 다음부터는 비밀번호 묻지 않음

비밀번호는 SHA-256 해시로만 저장되며, GitHub에 평문으로 노출되지 않습니다.

---

## 7. 매일 아침 워크플로우

1. 점장 노트북에서 Pages URL 접속
2. ADMIN → `1212`
3. 엑셀 드래그 → "✓ 업로드 완료" (10~30초)
4. 1~2분 후 직원 화면 자동 반영

직원들은 그냥 북마크된 URL만 열면 됩니다.

---

## 보안 주의사항

⚠️ **솔직히 알아두실 점**: GitHub Pages는 정적 파일 서버라서, 데이터 파일(`inventory.json`)은 URL을 안다면 직접 받아갈 수 있습니다. 직원 비밀번호 잠금은 **"브라우저로 페이지 열었을 때 화면을 안 보이게 하는" 수준**입니다. 추측 어려운 저장소 이름 + 직원용 비밀번호 조합으로 일반인 접근은 충분히 막을 수 있어요.

진짜 보안이 필요해질 때 → **Cloudflare Pages + Access** (무료, 직원 이메일 화이트리스트)로 마이그레이션 가능. 5분이면 됩니다. 필요해지면 알려주세요.

---

## 자주 묻는 것

**Q. 토큰이 노출되면?**
토큰은 점장 브라우저(localStorage)에만 저장. 분실 의심되면 4번에서 새로 생성 → ADMIN → 설정 → 새 토큰 입력.

**Q. 직원이 비밀번호를 잊었을 때?**
점장이 ADMIN → 설정 → "직원용 비밀번호" 새로 입력 → 적용.

**Q. 비밀번호 변경 시 직원들은?**
다음 새로고침에서 새 비밀번호 입력 필요. 자동으로 기존 unlock은 무효화됨.

**Q. 자사 도메인 연결 (`inventory.racement.co.kr`)?**
저장소 Settings → Pages → Custom domain. 도메인 권한 있으시면 가이드 드립니다.

---

## 다음 단계 (보류 중)

- 제품 이미지 자동 표시 — Racement 자사몰 검색 URL 패턴 확인 후 구현
- ERP에 자사몰 productNo 컬럼이 있다면 이미지 100% 자동 매칭 가능

