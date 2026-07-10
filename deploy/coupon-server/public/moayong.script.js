document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('couponForm');
    const toggleButton = document.getElementById('toggleIdInfo');
    const imageSection = document.getElementById('image-section');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const gameId = document.getElementById('game-id').value.trim();
            const coupon = document.getElementById('coupon').value.trim();

            if (!gameId) {
                alert('게임 ID를 입력해주세요.');
                return;
            }

            if (!/^\d+$/.test(gameId) || gameId.length < 12 || gameId.length > 13) {
                alert('정확한 게임 ID를 입력해주세요.');
                return;
            }

            if (!coupon) {
                alert('쿠폰 번호를 입력해주세요.');
                return;
            }

            try {
                const response = await fetch('/moayong/coupon-server/api/redeem-coupon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uid: gameId,
                        card: coupon
                    })
                });

                const data = await response.json();

                if (data.code === 100) {
                    alert('쿠폰 사용이 완료되었습니다.');
                } else {
                    alert(data.msg || '쿠폰 사용에 실패했습니다.');
                }

            } catch (error) {
                console.error('에러 발생:', error);
                alert('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
        });
    } else {
        console.error('쿠폰 폼을 찾을 수 없습니다.');
    }

    if (toggleButton && imageSection) {
        toggleButton.addEventListener('click', function () {
            if (imageSection.style.display === 'none' || imageSection.style.display === '') {
                imageSection.style.display = 'block';
                imageSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                imageSection.style.display = 'none';
            }
        });
    }
});