import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  UserModel as User,
  MiniHomeModel as MiniHome,
  PartnerProjectModel as PartnerProject,
} from '@gameup/db'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

async function seedPartnerTest() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const hashedPw = await bcrypt.hash('test123456', 12)

  // ─── 1. 기업회원 (게임개발사) - 승인 완료 ────────────────────
  console.log('🏢 기업회원 (파트너 테스트 계정) 생성...')

  const devCompany = await User.findOneAndUpdate(
    { email: 'devstudio@test.com' },
    {
      email: 'devstudio@test.com',
      username: '넥스트레벨 스튜디오',
      password: hashedPw,
      role: 'developer',
      isActive: true,
      memberType: 'corporate',
      level: 7,
      activityScore: 320,
      points: 8000,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      companyInfo: {
        companyName: '넥스트레벨 스튜디오',
        phone: '02-555-1234',
        companyEmail: 'info@nextlevel.co.kr',
        employeeCount: 15,
        businessNumber: '234-56-78901',
        companyType: ['developer'],
        homepageUrl: 'https://nextlevel-studio.co.kr',
        isApproved: true,
        approvalStatus: 'approved',
        description: '모바일 RPG 전문 개발사입니다. 10년간 다수의 히트 게임을 개발한 경험이 있습니다.',
      },
      contactPerson: {
        name: '박지훈',
        phone: '010-1111-2222',
        email: 'park@nextlevel.co.kr',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const partnerCompany = await User.findOneAndUpdate(
    { email: 'partner@test.com' },
    {
      email: 'partner@test.com',
      username: '게임솔루션즈',
      password: hashedPw,
      role: 'developer',
      isActive: true,
      memberType: 'corporate',
      level: 6,
      activityScore: 250,
      points: 6000,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      companyInfo: {
        companyName: '게임솔루션즈',
        phone: '02-777-9999',
        companyEmail: 'contact@gamesolutions.kr',
        employeeCount: 8,
        businessNumber: '345-67-89012',
        companyType: ['game_solution', 'qa'],
        homepageUrl: 'https://gamesolutions.kr',
        isApproved: true,
        approvalStatus: 'approved',
        description: 'QA 테스팅 및 게임 솔루션 전문 기업입니다. 200개 이상의 프로젝트 QA 경험이 있습니다.',
      },
      contactPerson: {
        name: '이서연',
        phone: '010-3333-4444',
        email: 'lee@gamesolutions.kr',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const publisherCompany = await User.findOneAndUpdate(
    { email: 'publisher@test.com' },
    {
      email: 'publisher@test.com',
      username: '글로벌게임즈',
      password: hashedPw,
      role: 'developer',
      isActive: true,
      memberType: 'corporate',
      level: 8,
      activityScore: 400,
      points: 12000,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      companyInfo: {
        companyName: '글로벌게임즈 퍼블리싱',
        phone: '02-888-5555',
        companyEmail: 'hello@globalgames.co.kr',
        employeeCount: 30,
        businessNumber: '456-78-90123',
        companyType: ['publisher', 'marketing'],
        homepageUrl: 'https://globalgames.co.kr',
        isApproved: true,
        approvalStatus: 'approved',
        description: '글로벌 퍼블리싱 및 마케팅 전문 기업입니다. 한국, 일본, 동남아 시장 진출 경험이 풍부합니다.',
      },
      contactPerson: {
        name: '최민수',
        phone: '010-5555-6666',
        email: 'choi@globalgames.co.kr',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log('  ✅ devstudio@test.com / test123456 (게임개발사 - 넥스트레벨 스튜디오)')
  console.log('  ✅ partner@test.com / test123456 (QA/솔루션 - 게임솔루션즈)')
  console.log('  ✅ publisher@test.com / test123456 (퍼블리셔 - 글로벌게임즈)')

  // ─── 2. 미니홈 (파트너 프로필) 생성 ──────────────────────────
  console.log('\n🏠 미니홈 (파트너 프로필) 생성...')

  await MiniHome.findOneAndUpdate(
    { userId: devCompany._id },
    {
      userId: devCompany._id,
      companyName: '넥스트레벨 스튜디오',
      introduction: '모바일 RPG 전문 개발사입니다. Unity와 Unreal Engine을 활용한 고품질 게임 개발 경험이 풍부합니다. 10년간 20개 이상의 게임을 성공적으로 출시했습니다.',
      isPublic: true,
      expertiseArea: ['developer'],
      skills: ['Unity', 'Unreal Engine', 'C#', 'C++', 'Blender', '3D 모델링', 'Firebase'],
      hourlyRate: '시급 120,000원',
      availability: 'available',
      location: '서울 강남구',
      isVerified: true,
      rating: 4.8,
      reviewCount: 12,
      completedProjectCount: 8,
      contactEmail: 'info@nextlevel.co.kr',
      contactPhone: '02-555-1234',
      portfolio: [
        {
          title: '드래곤 나이츠 온라인',
          description: 'MMORPG 모바일 게임. 실시간 PvP 시스템과 길드 전쟁 콘텐츠를 구현했습니다.',
          imageUrl: '',
          technologies: ['Unity', 'Photon', 'Firebase', 'Node.js'],
          results: ['다운로드 100만+', '매출 Top 50 달성', '유저 평점 4.5'],
          clientName: '자체 개발',
          duration: '18개월',
          completedAt: new Date('2025-06-01'),
        },
        {
          title: '퍼즐 킹덤',
          description: '매치3 퍼즐 게임. 500개 이상의 스테이지와 시즌 이벤트 시스템.',
          imageUrl: '',
          technologies: ['Unity', 'C#', 'AWS'],
          results: ['다운로드 50만+', 'DAU 3만명'],
          clientName: '자체 개발',
          duration: '12개월',
          completedAt: new Date('2024-12-01'),
        },
      ],
      certifications: [
        { name: 'Unity Certified Developer', issuedAt: '2023-05' },
        { name: 'AWS Solutions Architect', issuedAt: '2024-01' },
      ],
      workExperience: [
        { title: '모바일 RPG 개발', description: '다수의 모바일 RPG 게임 개발 및 라이브 서비스 운영 경험', period: '2016 ~ 현재' },
        { title: '게임 서버 개발', description: 'Node.js / Go 기반 실시간 게임 서버 개발 및 인프라 관리', period: '2018 ~ 현재' },
      ],
    },
    { upsert: true }
  )

  await MiniHome.findOneAndUpdate(
    { userId: partnerCompany._id },
    {
      userId: partnerCompany._id,
      companyName: '게임솔루션즈',
      introduction: 'QA 테스팅 및 게임 솔루션 전문 기업입니다. 자동화 테스트, 성능 테스트, 현지화 테스트 등 포괄적인 QA 서비스를 제공합니다.',
      isPublic: true,
      expertiseArea: ['game_solution', 'qa'],
      skills: ['자동화 테스트', 'Selenium', 'Appium', 'JMeter', '성능 테스트', '현지화 QA', 'JIRA', 'TestRail'],
      hourlyRate: '시급 80,000원',
      availability: 'available',
      location: '서울 마포구',
      isVerified: true,
      rating: 4.5,
      reviewCount: 25,
      completedProjectCount: 15,
      contactEmail: 'contact@gamesolutions.kr',
      contactPhone: '02-777-9999',
      portfolio: [
        {
          title: 'AAA 모바일 게임 QA',
          description: '대형 퍼블리셔의 모바일 게임 QA 프로젝트. 5개국 현지화 테스트 수행.',
          imageUrl: '',
          technologies: ['Selenium', 'Appium', 'TestRail', 'JIRA'],
          results: ['버그 발견율 98%', '출시 후 크리티컬 버그 0건'],
          clientName: '대형 퍼블리셔 A사',
          duration: '6개월',
          completedAt: new Date('2025-09-01'),
        },
      ],
      certifications: [
        { name: 'ISTQB Foundation Level', issuedAt: '2022-03' },
        { name: 'AWS Cloud Practitioner', issuedAt: '2023-08' },
      ],
      workExperience: [
        { title: '게임 QA 전문', description: '200개 이상의 게임 프로젝트 QA 수행. 자동화 테스트 파이프라인 구축.', period: '2019 ~ 현재' },
      ],
    },
    { upsert: true }
  )

  await MiniHome.findOneAndUpdate(
    { userId: publisherCompany._id },
    {
      userId: publisherCompany._id,
      companyName: '글로벌게임즈 퍼블리싱',
      introduction: '한국, 일본, 동남아 시장 전문 퍼블리싱 기업입니다. 게임 현지화, 마케팅, 운영 지원까지 원스톱 서비스를 제공합니다.',
      isPublic: true,
      expertiseArea: ['publisher', 'marketing'],
      skills: ['퍼블리싱', '현지화', '마케팅', 'UA', 'ASO', '커뮤니티 관리', 'Google Ads', 'Facebook Ads'],
      hourlyRate: '프로젝트 단위 협의',
      availability: 'busy',
      location: '서울 성동구',
      isVerified: true,
      rating: 4.7,
      reviewCount: 18,
      completedProjectCount: 22,
      contactEmail: 'hello@globalgames.co.kr',
      contactPhone: '02-888-5555',
      portfolio: [
        {
          title: '일본 시장 진출 프로젝트',
          description: '한국 RPG 게임의 일본 시장 현지화 및 퍼블리싱. 일본어 현지화, UA 마케팅, 커뮤니티 운영.',
          imageUrl: '',
          technologies: ['Google Ads', 'AppsFlyer', 'Adjust'],
          results: ['일본 앱스토어 RPG 카테고리 Top 10', '월 매출 5억원 달성'],
          clientName: '한국 게임사 B사',
          duration: '12개월',
          completedAt: new Date('2025-11-01'),
        },
        {
          title: '동남아 멀티 퍼블리싱',
          description: '캐주얼 게임 동남아 5개국 동시 론칭. 현지 마케팅 및 커뮤니티 운영.',
          imageUrl: '',
          technologies: ['Facebook Ads', 'TikTok Ads', 'LINE'],
          results: ['5개국 동시 론칭 성공', '총 다운로드 300만+'],
          clientName: '한국 게임사 C사',
          duration: '8개월',
          completedAt: new Date('2025-07-01'),
        },
      ],
      certifications: [
        { name: 'Google Ads 인증', issuedAt: '2024-02' },
        { name: 'Meta Marketing Professional', issuedAt: '2024-06' },
      ],
      workExperience: [
        { title: '글로벌 퍼블리싱', description: '10개국 이상 게임 퍼블리싱 경험. 현지화부터 운영까지 엔드투엔드 서비스 제공.', period: '2017 ~ 현재' },
        { title: '디지털 마케팅', description: 'UA, ASO, 퍼포먼스 마케팅 전략 수립 및 실행. 월 예산 10억원 이상 집행 경험.', period: '2015 ~ 현재' },
      ],
    },
    { upsert: true }
  )

  console.log('  ✅ 넥스트레벨 스튜디오 - 미니홈 생성 (개발사, 인증, 평점 4.8)')
  console.log('  ✅ 게임솔루션즈 - 미니홈 생성 (QA/솔루션, 인증, 평점 4.5)')
  console.log('  ✅ 글로벌게임즈 퍼블리싱 - 미니홈 생성 (퍼블리셔, 인증, 평점 4.7)')

  // ─── 3. 샘플 프로젝트 생성 ───────────────────────────────────
  console.log('\n📋 파트너 프로젝트 생성...')

  await PartnerProject.findOneAndUpdate(
    { title: '모바일 RPG 공동 개발 파트너 모집' },
    {
      ownerId: devCompany._id,
      title: '모바일 RPG 공동 개발 파트너 모집',
      description: '신규 모바일 RPG 프로젝트의 클라이언트 개발 파트너를 모집합니다.',
      detailedDescription: '현재 기획 및 서버 개발이 진행 중이며, Unity 기반 클라이언트 개발을 담당할 파트너사를 모집합니다. 3D 캐릭터 모델링, UI/UX 구현, 전투 시스템 개발이 주요 업무입니다.',
      category: '게임 개발',
      status: 'recruiting',
      budget: '5,000만원 ~ 1억원',
      budgetMin: '5000',
      budgetMax: '10000',
      duration: '6개월',
      location: '서울 (원격 가능)',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-09-30'),
      requiredSkills: ['Unity', 'C#', '3D 모델링', 'UI/UX'],
      requirements: [
        'Unity 3D 개발 경력 3년 이상',
        'RPG 장르 개발 경험 필수',
        '포트폴리오 제출 필수',
        '주 3회 이상 온/오프라인 미팅 참여 가능',
      ],
      milestones: [
        { phase: '1단계', period: '1~2개월', description: '프로토타입 개발 및 핵심 시스템 구현' },
        { phase: '2단계', period: '3~4개월', description: '콘텐츠 제작 및 UI/UX 구현' },
        { phase: '3단계', period: '5~6개월', description: 'QA 및 최적화, CBT 준비' },
      ],
      applicationDeadline: new Date('2026-04-15'),
      applicantCount: 3,
    },
    { upsert: true }
  )

  await PartnerProject.findOneAndUpdate(
    { title: 'QA 테스팅 외주 파트너 모집' },
    {
      ownerId: devCompany._id,
      title: 'QA 테스팅 외주 파트너 모집',
      description: '출시 예정 모바일 게임의 종합 QA 테스팅 파트너를 모집합니다.',
      detailedDescription: '6월 출시 예정인 모바일 게임의 전체 QA를 담당할 파트너사를 모집합니다. 기능 테스트, 성능 테스트, 호환성 테스트, 현지화 테스트(한/영/일)를 포함합니다.',
      category: 'QA/테스트',
      status: 'recruiting',
      budget: '2,000만원 ~ 3,000만원',
      budgetMin: '2000',
      budgetMax: '3000',
      duration: '3개월',
      location: '원격',
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-07-15'),
      requiredSkills: ['QA', '자동화 테스트', '성능 테스트', '현지화 QA'],
      requirements: [
        '게임 QA 경력 2년 이상',
        '자동화 테스트 도구 활용 능력',
        '다국어 현지화 테스트 경험 우대',
        '테스트 결과 보고서 작성 능력',
      ],
      milestones: [
        { phase: '1단계', period: '1개월', description: '테스트 계획 수립 및 기능 테스트' },
        { phase: '2단계', period: '2개월', description: '성능/호환성 테스트 및 현지화 QA' },
        { phase: '3단계', period: '3개월', description: '최종 리그레션 테스트 및 보고서' },
      ],
      applicationDeadline: new Date('2026-04-10'),
      applicantCount: 5,
    },
    { upsert: true }
  )

  await PartnerProject.findOneAndUpdate(
    { title: '일본 시장 퍼블리싱 파트너 모집' },
    {
      ownerId: publisherCompany._id,
      title: '일본 시장 퍼블리싱 파트너 모집',
      description: '인기 모바일 게임의 일본 시장 진출을 위한 현지화 및 마케팅 파트너를 모집합니다.',
      detailedDescription: '한국에서 성공한 모바일 RPG의 일본 시장 진출 프로젝트입니다. 게임 현지화(일본어), UA 마케팅, 일본 앱스토어 ASO, 일본 커뮤니티 운영을 담당할 파트너사를 찾습니다.',
      category: '마케팅/홍보',
      status: 'recruiting',
      budget: '1억원 ~ 2억원',
      budgetMin: '10000',
      budgetMax: '20000',
      duration: '12개월',
      location: '서울/도쿄',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2027-04-30'),
      requiredSkills: ['현지화', '일본어', 'UA 마케팅', 'ASO', '커뮤니티 운영'],
      requirements: [
        '일본 시장 퍼블리싱 경험 필수',
        '일본어 네이티브 수준 인력 보유',
        'UA 마케팅 월 예산 5억원 이상 집행 경험',
        '일본 앱스토어/구글플레이 ASO 최적화 경험',
      ],
      milestones: [
        { phase: '1단계', period: '1~3개월', description: '현지화 작업 및 소프트 론칭' },
        { phase: '2단계', period: '4~8개월', description: '정식 론칭 및 UA 마케팅' },
        { phase: '3단계', period: '9~12개월', description: '라이브 운영 및 매출 최적화' },
      ],
      applicationDeadline: new Date('2026-04-30'),
      applicantCount: 2,
    },
    { upsert: true }
  )

  console.log('  ✅ 모바일 RPG 공동 개발 파트너 모집 (모집중)')
  console.log('  ✅ QA 테스팅 외주 파트너 모집 (모집중)')
  console.log('  ✅ 일본 시장 퍼블리싱 파트너 모집 (모집중)')

  // ─── Done ────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 파트너 테스트 데이터 생성 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📋 기업회원 테스트 계정:')
  console.log('  🏢 개발사: devstudio@test.com / test123456 (넥스트레벨 스튜디오)')
  console.log('  🔧 QA/솔루션: partner@test.com / test123456 (게임솔루션즈)')
  console.log('  📢 퍼블리셔: publisher@test.com / test123456 (글로벌게임즈)')
  console.log('\n🌐 테스트 페이지:')
  console.log('  파트너 메인: http://localhost:3000/partner')
  console.log('  파트너 디렉토리: http://localhost:3000/partner/directory')
  console.log('  프로젝트: http://localhost:3000/partner/projects')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await mongoose.connection.close()
  process.exit(0)
}

seedPartnerTest().catch((err) => {
  console.error('❌ 시드 실패:', err)
  process.exit(1)
})
