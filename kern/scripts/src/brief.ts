// SessionStart 훅 진입점: 세션 시작 브리핑을 출력한다 (S0 에서는 침묵 스텁)
// S0: 아무것도 출력하지 않고 exit 0. vault 판정과 브리핑 출력은 S5 에서 구현한다.
// 주의: SessionStart 훅의 stdout 은 Claude 컨텍스트에 추가되므로 빈 출력을 유지한다.
