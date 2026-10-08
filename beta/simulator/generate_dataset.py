#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAFE CORE - Synthetic Data Generator & Simulator (Python)
Specification: beta/dataset-analysis-plan-v2.html

Generates:
  1. user_sessions.ndjson & .csv (5,000 sessions: 4,500 converted, 500 abandoned)
  2. orders.ndjson & .csv (4,500 converted orders)
  3. users.ndjson & .csv (600 customers: 400 registered members, 200 guest identities)
  4. search_logs.ndjson & .csv (~3,800 search query logs)
"""

import json
import csv
import random
import os
import sys
import math
from datetime import datetime, timedelta

# Windows 콘솔 인코딩 대응
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def main():
    # 고정 시드로 재현성 보장
    random.seed(42)

    # 출력 디렉터리 설정 (data/)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, 'data')
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 65)
    print("[START] CAFE CORE 데이터 시뮬레이터 시작 (Specification v2.0)")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. 고객 풀 (Users: 회원 400명 + 비회원 200명 = 총 600명)
    # -------------------------------------------------------------
    users = []
    
    # 1-1. 회원 400명 (VIP 80명, REGULAR 240명, NEW 80명)
    tiers = ['VIP'] * 80 + ['REGULAR'] * 240 + ['NEW'] * 80
    random.shuffle(tiers)

    preset_templates = [
        {"name": "ICE 아메리카노 +1샷", "temp": "ICE", "size": "large", "shots": 1, "syrup": "default", "ice": "normal"},
        {"name": "HOT 카페라떼 연하게", "temp": "HOT", "size": "regular", "shots": 0, "syrup": "default", "ice": "none"},
        {"name": "ICE 바닐라라떼 덜달게", "temp": "ICE", "size": "large", "shots": 0, "syrup": "less", "ice": "less"},
        {"name": "디카페인 아메리카노", "temp": "ICE", "size": "venti", "shots": 0, "syrup": "default", "ice": "normal"},
        {"name": "복숭아 아이스티 +얼음많이", "temp": "ICE", "size": "large", "shots": 0, "syrup": "default", "ice": "more"}
    ]

    for i in range(1, 401):
        uid = f"usr-{i:04d}"
        tier = tiers[i - 1]
        has_preset = random.random() < (0.85 if tier == 'VIP' else (0.50 if tier == 'REGULAR' else 0.20))
        preset = random.choice(preset_templates) if has_preset else None
        
        users.append({
            "user_id": uid,
            "member_type": tier,
            "is_member": True,
            "option_preset": preset,
            "preferred_packaging": "TAKE_OUT" if random.random() < 0.72 else "DINE_IN",
            "tumbler_user": random.random() < (0.24 if tier == 'VIP' else 0.10)
        })

    # 1-2. 비회원 200명 (GUEST)
    for i in range(1, 201):
        gid = f"guest-{i:04d}"
        users.append({
            "user_id": gid,
            "member_type": "GUEST",
            "is_member": False,
            "option_preset": None,
            "preferred_packaging": "TAKE_OUT" if random.random() < 0.60 else "DINE_IN",
            "tumbler_user": random.random() < 0.04
        })

    print(f"[OK] 고객 풀 생성 완료: 총 {len(users)}명 (회원 400명, 비회원 200명)")

    # -------------------------------------------------------------
    # 2. 메뉴 및 카테고리 마스터 정의
    # -------------------------------------------------------------
    menu_items = [
        {"id": "americano", "name": "아메리카노", "category": "coffee", "price": 3500},
        {"id": "cafe_latte", "name": "카페 라떼", "category": "coffee", "price": 4500},
        {"id": "vanilla_latte", "name": "바닐라 라떼", "category": "coffee", "price": 5000},
        {"id": "coldbrew", "name": "콜드브루", "category": "coffee", "price": 4500},
        {"id": "decaf_americano", "name": "디카페인 아메리카노", "category": "decaf", "price": 4000},
        {"id": "earl_grey_tea", "name": "얼그레이 티", "category": "tea", "price": 4000},
        {"id": "peach_iced_tea", "name": "복숭아 아이스티", "category": "tea", "price": 4000},
        {"id": "lemon_iced_tea", "name": "레몬 아이스티", "category": "tea", "price": 4000},
        {"id": "lemon_ade", "name": "레몬 에이드", "category": "ade", "price": 4800},
        {"id": "grapefruit_ade", "name": "자몽 에이드", "category": "ade", "price": 4800},
        {"id": "strawberry_smoothie", "name": "딸기 요거트 스무디", "category": "smoothie", "price": 5500},
        {"id": "mango_smoothie", "name": "망고 스무디", "category": "smoothie", "price": 5500},
        {"id": "matcha_latte", "name": "제주 말차 라떼", "category": "beverage", "price": 5200}
    ]

    search_query_pool = [
        {"q": "아아", "target": "americano"},
        {"q": "아메리카노", "target": "americano"},
        {"q": "라떼", "target": "cafe_latte"},
        {"q": "바닐라라떼", "target": "vanilla_latte"},
        {"q": "디카페인", "target": "decaf_americano"},
        {"q": "아이스티", "target": "peach_iced_tea"},
        {"q": "스무디", "target": "strawberry_smoothie"},
        {"q": "딸기", "target": "strawberry_smoothie"},
        {"q": "망고", "target": "mango_smoothie"},
        {"q": "말차", "target": "matcha_latte"},
        {"q": "콜드브루", "target": "coldbrew"},
        {"q": "에이드", "target": "lemon_ade"},
        {"q": "밀크티", "target": None},
        {"q": "샌드위치", "target": None}
    ]

    # -------------------------------------------------------------
    # 3. 5,000건 세션 생성 (구매 4,500건 + 포기 500건)
    # -------------------------------------------------------------
    sessions = []
    orders = []
    search_logs = []

    # 전환 여부 플래그 배열 생성 (정확히 4,500개 False, 500개 True)
    abandon_flags = [True] * 500 + [False] * 4500
    random.shuffle(abandon_flags)

    # 이탈 사유 및 단계 정의 (spec 반영: 가격저항 220, 대기 140, 타임아웃 140)
    abandon_reasons = (
        ['PRICE_HIGH'] * 220 +
        ['WAIT_TIME_LONG'] * 140 +
        ['TIMEOUT_60S'] * 140
    )
    random.shuffle(abandon_reasons)

    abandon_stages = (
        ['CART_SHEET'] * 210 +
        ['OPTION_MODAL'] * 180 +
        ['PAY_POPUP'] * 110
    )
    random.shuffle(abandon_stages)

    start_date = datetime(2026, 9, 15, 8, 0, 0)
    current_abandon_idx = 0
    order_seq = 1
    search_seq = 1

    member_users = [u for u in users if u['is_member']]
    guest_users = [u for u in users if not u['is_member']]

    for s_idx in range(5000):
        session_id = f"ses-20261008-{s_idx + 1:04d}"
        is_abandoned = abandon_flags[s_idx]

        # 채널 배정: PWA 58% (2,900건), KIOSK 42% (2,100건)
        channel = 'PWA' if s_idx < 2900 else 'KIOSK'

        # 고객 매핑: PWA는 회원 비중 높음 (70%), KIOSK는 비회원 비중 높음 (65%)
        if channel == 'PWA':
            user = random.choice(member_users) if random.random() < 0.70 else random.choice(guest_users)
        else:
            user = random.choice(guest_users) if random.random() < 0.65 else random.choice(member_users)

        # 시간대 시뮬레이션 (30일 분산, 출근/점심 피크 가중)
        day_offset = random.randint(0, 23)
        hour_rand = random.random()
        if hour_rand < 0.35:
            hour = random.randint(8, 9) # 출근 피크
        elif hour_rand < 0.70:
            hour = random.randint(12, 13) # 점심 피크
        elif hour_rand < 0.88:
            hour = random.randint(14, 17) # 오후 티타임
        else:
            hour = random.randint(18, 20) # 저녁
        
        session_time = start_date + timedelta(days=day_offset, hours=hour, minutes=random.randint(0, 59), seconds=random.randint(0, 59))

        # 카테고리 경로 생성
        path_length = random.choices([1, 2, 3, 4], weights=[0.45, 0.35, 0.15, 0.05])[0]
        categories_available = ['all', 'coffee', 'tea', 'ade', 'smoothie', 'decaf']
        category_path = ['all'] + random.sample(categories_available[1:], min(path_length, 4))

        # 검색 로그 시뮬레이션 (세션 중 약 45%에서 검색 실행)
        has_search = random.random() < 0.45
        if has_search:
            sq = random.choice(search_query_pool)
            search_id = f"sch-{search_seq:05d}"
            search_seq += 1
            search_logs.append({
                "search_id": search_id,
                "session_id": session_id,
                "keyword": sq["q"],
                "result_count": 0 if sq["target"] is None else random.randint(1, 4),
                "clicked_menu_id": sq["target"] if (sq["target"] and random.random() < 0.75) else None,
                "timestamp": session_time.isoformat() + "Z"
            })

        # 소요 시간 모델링
        is_preset_used = False
        if not is_abandoned and user['is_member'] and user['option_preset'] and random.random() < 0.45:
            is_preset_used = True
            # 단골 1-Click: 평균 24.8초
            duration_sec = max(12.0, random.gauss(24.8, 5.8))
        elif channel == 'KIOSK':
            # 키오스크: 평균 62초
            duration_sec = max(25.0, random.gauss(62.5, 14.2))
        else:
            # PWA 일반 탐색: 평균 104초
            duration_sec = max(35.0, random.gauss(104.2, 24.3))

        if is_abandoned:
            duration_sec = min(150.0, duration_sec + random.uniform(10.0, 30.0))

        session_duration_ms = int(duration_sec * 1000)

        # 전환 분기
        if is_abandoned:
            abandon_stage = abandon_stages[current_abandon_idx]
            abandon_reason = abandon_reasons[current_abandon_idx]
            current_abandon_idx += 1
            order_id = None
        else:
            abandon_stage = None
            abandon_reason = None
            order_id = f"ORD-{order_seq:04d}"

            # 주문 데이터 생성
            # 메뉴 선택
            if is_preset_used:
                chosen_menu = next(m for m in menu_items if m['id'] in ['americano', 'cafe_latte', 'vanilla_latte'])
                opt = user['option_preset'].copy()
            else:
                chosen_menu = random.choice(menu_items)
                opt = {
                    "temp": "ICE" if random.random() < 0.78 else "HOT",
                    "size": random.choices(["regular", "large", "venti"], weights=[0.55, 0.35, 0.10])[0],
                    "shots": random.choices([0, 1, 2], weights=[0.60, 0.30, 0.10])[0] if chosen_menu['category'] in ['coffee', 'decaf'] else 0,
                    "syrup": random.choices(["default", "less", "vanilla", "hazelnut"], weights=[0.70, 0.15, 0.10, 0.05])[0],
                    "ice": random.choices(["normal", "less", "more"], weights=[0.70, 0.20, 0.10])[0]
                }

            # 가격 계산
            unit_price = chosen_menu['price']
            if opt.get('size') == 'large': unit_price += 500
            elif opt.get('size') == 'venti': unit_price += 1000
            if opt.get('shots', 0) > 0: unit_price += (opt['shots'] * 500)
            if opt.get('syrup') in ['vanilla', 'hazelnut']: unit_price += 500

            qty = random.choices([1, 2, 3], weights=[0.82, 0.15, 0.03])[0]
            total_amount = unit_price * qty

            # 취식 형태 및 컵 종류
            is_morning_lunch = hour in [8, 9, 12, 13]
            packaging = "TAKE_OUT" if (is_morning_lunch and random.random() < 0.80) else ("DINE_IN" if random.random() < 0.65 else "TAKE_OUT")
            
            if user['tumbler_user'] and random.random() < 0.70:
                cup_type = "TUMBLER"
                total_amount = max(0, total_amount - 300) # 텀블러 300원 할인
            elif packaging == "DINE_IN":
                cup_type = "MUG"
            else:
                cup_type = "DISPOSABLE"

            orders.append({
                "order_id": order_id,
                "session_id": session_id,
                "user_id": user['user_id'],
                "is_member": user['is_member'],
                "channel": channel,
                "menu_id": chosen_menu['id'],
                "menu_name": chosen_menu['name'],
                "quantity": qty,
                "options": opt,
                "total_amount": total_amount,
                "packaging_type": packaging,
                "cup_type": cup_type,
                "is_preset_order": is_preset_used,
                "time_to_order_ms": session_duration_ms,
                "created_at": session_time.isoformat() + "Z",
                "status": "COMPLETED"
            })
            order_seq += 1

        sessions.append({
            "session_id": session_id,
            "user_id": user['user_id'],
            "is_member": user['is_member'],
            "channel": channel,
            "session_duration_ms": session_duration_ms,
            "category_path": category_path,
            "is_abandoned": is_abandoned,
            "abandon_stage": abandon_stage,
            "abandon_reason": abandon_reason,
            "order_id": order_id,
            "timestamp": session_time.isoformat() + "Z"
        })

    # -------------------------------------------------------------
    # 4. 파일 저장 (NDJSON & CSV)
    # -------------------------------------------------------------
    datasets = [
        ("user_sessions", sessions),
        ("orders", orders),
        ("users", users),
        ("search_logs", search_logs)
    ]

    for name, data in datasets:
        ndjson_path = os.path.join(output_dir, f"{name}.ndjson")
        csv_path = os.path.join(output_dir, f"{name}.csv")

        # 4-1. NDJSON 쓰기
        with open(ndjson_path, 'w', encoding='utf-8') as f:
            for row in data:
                f.write(json.dumps(row, ensure_ascii=False) + '\n')

        # 4-2. CSV 쓰기
        if data:
            keys = list(data[0].keys())
            with open(csv_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                for row in data:
                    row_copy = row.copy()
                    for k, v in row_copy.items():
                        if isinstance(v, (dict, list)):
                            row_copy[k] = json.dumps(v, ensure_ascii=False)
                    writer.writerow(row_copy)

        print(f"[OK] [{name}] 생성 완료: {len(data):,}건 -> {ndjson_path}")

    print("=" * 65)
    print("[SUCCESS] 전체 4대 데이터셋 생성 완료:")
    print(f"  * 세션 수: {len(sessions):,}건 (구매 {len(orders):,}건 / 포기 {current_abandon_idx:,}건)")
    print(f"  * 전환율(CVR): {(len(orders) / len(sessions)) * 100:.1f}% / 이탈률: {(current_abandon_idx / len(sessions)) * 100:.1f}%")
    print(f"  * 저장 위치: {output_dir}")
    print("=" * 65)

if __name__ == '__main__':
    main()
