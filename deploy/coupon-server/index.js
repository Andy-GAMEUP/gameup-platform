require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3002;

// .env 파일에서 서명 키 불러오기
const SECRET_KEY = process.env.SECRET_KEY;

// 개발사에서 전달한 최신 쿠폰 API
const COUPON_API_URL = process.env.COUPON_API_URL || 'https://kross.moayong.co.kr/fbzg/api/gift/gain';

// JSON 요청 처리
app.use(express.json({ limit: '10kb' }));

// GitHub Pages 미러 페이지(별도 도메인)에서 쿠폰 API만 호출할 수 있도록 허용
const ALLOWED_ORIGIN = 'https://dckim-capcloud.github.io';
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// 정적 파일 제공 경로 설정
// coupon.html에서 /moayong/coupon-server/public/styles.css 처럼 호출하는 경우 필요
app.use(
    '/moayong/coupon-server/public',
    express.static(path.join(__dirname, 'public'))
);

// 로컬 테스트용 정적 파일 경로
// http://localhost:3002/coupon.html 같은 접근도 가능하게 함
app.use(express.static(path.join(__dirname, 'public')));

// 루트 접속 시 coupon.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'coupon.html'));
});

// 실제 운영 URL이 /moayong/coupon-server/public/coupon.html 인 경우도 대응
app.get('/moayong/coupon-server/public/coupon.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'coupon.html'));
});

// 운영 URL을 /moayong/coupon-server/public.html 로 사용하는 경우
app.get('/moayong/coupon-server/public.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'coupon.html'));
});

// 서명 생성 함수
function generateSign(uid, card, datetime) {
    return crypto
        .createHash('md5')
        .update(String(uid) + String(card) + String(datetime) + SECRET_KEY)
        .digest('hex');
}

// 쿠폰 처리 공통 함수
async function redeemCoupon(req, res) {
    let { uid, card } = req.body;

    if (!SECRET_KEY) {
        console.error('SECRET_KEY가 설정되어 있지 않습니다.');
        return res.status(500).json({
            code: 500,
            msg: '서버 설정 오류가 발생했습니다.'
        });
    }

    if (!uid || !card) {
        return res.status(400).json({
            code: 400,
            msg: '게임 ID와 쿠폰 번호를 모두 입력해주세요.'
        });
    }

    uid = String(uid).trim();
    card = String(card).trim();

    if (!uid || !card) {
        return res.status(400).json({
            code: 400,
            msg: '게임 ID와 쿠폰 번호를 모두 입력해주세요.'
        });
    }

    // UID는 숫자만 허용
    if (!/^\d+$/.test(uid)) {
        return res.status(400).json({
            code: 400,
            msg: '게임 ID를 정확히 입력해주세요.'
        });
    }

    const datetime = Math.floor(Date.now() / 1000);
    const sign = generateSign(uid, card, datetime);

    const payload = {
        uid: Number(uid),
        card: card,
        datetime: datetime,
        sign: sign
    };

    // 운영 중에는 sign/key를 로그에 남기지 않는 것이 안전함
    console.log('쿠폰 API 요청 데이터:', {
        uid: payload.uid,
        card: payload.card,
        datetime: payload.datetime
    });

    try {
        const response = await fetch(COUPON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log('쿠폰 API 응답 데이터:', data);

        // 개발사 API는 HTTP 상태코드가 아니라 data.code로 성공/실패 판단
        return res.json({
            code: data.code,
            msg: data.msg || '처리 결과를 확인할 수 없습니다.',
            data: data.data || null
        });

    } catch (error) {
        console.error('쿠폰 API 요청 에러:', error);

        return res.status(500).json({
            code: 500,
            msg: '서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
}

// 기존 프론트에서 사용하던 API 경로 유지
app.post('/api/redeem-coupon', redeemCoupon);

// 혹시 프론트에서 /api/gift/gain으로 호출하는 경우도 대응
app.post('/api/gift/gain', redeemCoupon);

// 운영 경로가 /moayong/coupon-server/api/redeem-coupon 인 경우도 대응
app.post('/moayong/coupon-server/api/redeem-coupon', redeemCoupon);

// 운영 경로가 /moayong/coupon-server/api/gift/gain 인 경우도 대응
app.post('/moayong/coupon-server/api/gift/gain', redeemCoupon);

app.listen(PORT, () => {
    console.log(`Coupon server is running on http://localhost:${PORT}`);
});