"""나라장터 내부 준비 양식과 인쇄용 HTML을 생성합니다. 외부 송신은 하지 않습니다."""
from pathlib import Path
from html import escape
import json
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.properties import CalcProperties

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output'
OUT.mkdir(exist_ok=True)
CURRENT = json.loads((ROOT / 'evidence/company-current.json').read_text(encoding='utf-8'))

wb = Workbook()
wb.remove(wb.active)
wb.calculation = CalcProperties(calcId=191029, fullCalcOnLoad=True)

def sheet(name, headers, rows, widths):
    ws = wb.create_sheet(name)
    ws.append(headers)
    for row in rows:
        ws.append(row)
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions
    ws.sheet_view.showGridLines = False
    for cell in ws[1]:
        cell.font = Font(name='맑은 고딕', bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='244433')
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name='맑은 고딕', size=11)
            cell.alignment = Alignment(vertical='top', wrap_text=True)
            if cell.data_type == 'f':
                cell.fill = PatternFill('solid', fgColor='E8EFE9')
        ws.row_dimensions[row[0].row].height = 48
    for col, width in widths.items():
        ws.column_dimensions[col].width = width
    ws.print_options.horizontalCentered = True
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = '1:1'
    return ws

sheet('읽기안내', ['구분', '내용'], [
    ['기준', '2026-10-20 / NARA-20261020 / 내부 신청 준비용'],
    ['사용자 확인', '회사 미등록. 등기임원 계정으로 로그인 완료. 기업금융인증서 1년 4,400원 발급 승인 완료. 실제 발급·본인확인 대기'],
    ['확정 범위', '입력안·증빙 목록·실적·원가·자금·평가 양식 준비. 실제 신청서 저장·재조회 완료, 전자서명 대기. 투찰 미실행'],
    ['빈칸', '미확인 또는 미입력입니다. 비용 0원이나 요건 충족을 뜻하지 않습니다.'],
    ['수식', '초록 셀은 수식입니다. Excel에서 열면 재계산합니다. 모든 필수 입력 전에는 합계를 확정하지 않습니다.'],
    ['개인정보', '고객명·여권·주민번호·연락처·인증 비밀번호를 입력하지 마세요. 보안 보관 원본 참조만 기록합니다.'],
    ['원장', '사람 행동의 단일 원장은 foresttour/docs/사장님-가이드.md의 나라장터 절입니다.'],
    ['제출', '공식 공고 서식과 최신 증빙을 대조해야 합니다. 이 파일은 공식 신청서가 아닙니다.'],
], {'A':22,'B':110})

inputs = [
    ['법인명','주식회사 숲길여행','사업자등록증 전사','최신 원본 대조 필요'],
    ['사업자등록번호','584-81-01471','회사서류 README','최신 원본 대조 필요'],
    ['법인등록번호','110111-7220611','회사서류 README','최신 등기 대조 필요'],
    ['개업일','2020-01-01','회사서류 README','설립일과 구분'],
    ['본점 주소',CURRENT['address'],'2026-10-01 사업자등록증 DOC-14','등기부의 동·건물명 표기는 다르며 아직 정정 전'],
    ['우편번호',None,'주소 검색 결과로 확정','기존 우편번호 근거 불충분'],
    ['대표자',None,'최신 등기·사업자 원본','원본에서 직접 입력'],
    ['등록 구분','본사 신규 / 국내소재 법인 / 용역','사용자 미등록 확인','지사 신청 제외'],
    ['업종','국내외여행업 1262','현재 관광사업등록증 DOC-07과 실제 업종 검색 결과 일치','신청서 저장·재조회 완료, 전자서명 대기'],
    ['관광사업 등록번호',CURRENT['tourism_registration_number'],'현재 관광사업등록증 DOC-07','사업자번호와 구분'],
    ['관광사업 증서 날짜·관할청',CURRENT['tourism_certificate_issued_on']+' / '+CURRENT['tourism_authority'],'관광사업등록증 DOC-07','최초 등록일은 별도 확인'],
    ['현재 종업원수',None,'사용자: 대표자 1명·등기임원 1명, 총 2명','인원 구성을 종업원수 2명으로 자동 변환하지 않음. 화면 정의 확인 필요'],
    ['회사 업무 연락처',CURRENT['company_phone'],'사용자 직접 지정','회사 대표전화'],
    ['회사 업무 이메일',CURRENT['company_email'],'사용자 직접 지정','회사 업무 이메일'],
    ['인증서 종류',CURRENT['certificate'],'공개 인증서와 나라장터 공식 허용 목록 대조','표준 로컬 인증서 기간 유효, 용도 미허용. 비밀키 내용·비밀번호 미수집'],
    ['신청자 역할',CURRENT['applicant_role'],'사용자 확인',CURRENT['personal_member_account']+' / 실제 대표자는 별도 입력'],
    ['접수번호',None,'실제 송신 완료 뒤 기록','임시저장 완료, 회사 공동인증서 전자서명 대기'],
    ['승인 상태',None,'조달청 승인 화면','등록증 확보 전 완료 표시 금지'],
]
sheet('등록입력', ['항목','입력값','근거','확인 메모'], inputs, {'A':25,'B':65,'C':36,'D':45})

docs = [
    ['사업자등록증','기본 등록','사본 있음','2026-10-01','비공개 보관 DOC-14','현재 강서구 주소 직접 확인'],
    ['최신 법인등기','기본·대표자·지역','사본 있음','2026-09-29','비공개 보관 DOC-10','동·건물명 불일치, 사용자 확인: 정정 전'],
    ['관광사업등록증','업종 1262','사본 있음','2026-09-23','비공개 보관 DOC-07','국내외여행업·새 번호·강서구 주소 확인'],
    ['인감·사용인감','신청별 요구','미확인',None,None,'현행 화면의 실제 요구에 따름'],
    ['대리인 인정 자료','신청 역할별 요구','요구 확인 중',None,None,'등기임원 계정. 신청자와 실제 대표자를 구분하고 화면의 실제 요구를 확인'],
    ['소기업·소상공인확인','해당 공고','미확인',None,None,'입찰용 규모·유효기간·공공구매망'],
    ['공공입찰용 신용평가','해당 공고','미확인',None,None,'공고 전 평가 요구 여부 확인'],
    ['발주처 실적증명','해당 공고','미확인',None,None,'카페 여행 기록과 구분'],
    ['여행업 보험·공제','해당 공고·업종','미확인',None,None,'현재 증권과 보장기간 확인'],
    ['입찰·계약 보증','해당 공고','미확인',None,None,'보증액과 보험료·담보를 구분'],
    ['납세·보험 완납','공고·계약별 요구','미확인',None,None,'유효기간과 실제 제출 시점 확인'],
    ['공급사 확약·계약','수행 검증','미확인',None,None,'항공·호텔·차량·식사 등'],
]
ws = sheet('증빙대장',['서류','적용 단계','상태','발급·만료일','보안 원본 참조','메모'],docs,{'A':28,'B':24,'C':18,'D':25,'E':35,'F':52})
dv=DataValidation(type='list',formula1='"미확인,사본 있음,유효 원본 확인,발급 필요,해당 없음"')
ws.add_data_validation(dv); dv.add('C2:C13')

sheet('실적대장',['내부 식별자','용역·여행명','발주처 유형','완료일','계약금액 원','공고 인정금액 원','증명서 발급 여부','인정기간·범위 검토','보안 원본 참조'],[[None]*9 for _ in range(12)],{'A':20,'B':35,'C':23,'D':20,'E':22,'F':24,'G':24,'H':40,'I':35})

items=['항공·세금·유류','국내 이동','현지 적법 운송','숙박','식사','입장·프로그램','대장·현지 인력','주간·야간 안전 인력','여행자보험','보증보험 실제 보험료','통신·물·간식','환율·취소 등 위험 예산','기타 직접 비용']
rows=[]
for i,name in enumerate(items,2):
    rows.append([name,None,None,None,f'=IF(COUNT(B{i}:D{i})=3,ROUND(B{i}*C{i}*D{i},0),"")',None,None])
ws=sheet('견적입력',['비용 항목','단가 원','수량','횟수·박수','금액 원','견적 근거·유효일','취소·환율·세금 메모'],rows,{'A':29,'B':18,'C':15,'D':18,'E':22,'F':38,'G':48})
ws.append(['미사용 항목은 단가 0·수량 0·횟수 0을 입력합니다. 세금 포함·제외를 일관되게 맞춥니다.'])
ws.append(['원가 합계',None,None,None,'=IF(COUNT(E2:E14)=13,SUM(E2:E14),"")'])
ws.append(['제안 총액 입력',None,None,None,None])
ws.append(['계약 전체 차액',None,None,None,'=IF(COUNT(E16:E17)=2,E17-E16,"")'])
ws.append(['회사 귀속 이익 별도 입력',None,None,None,None,None,'대장 배분·공통비·세무 확인 후 별도 입력. 전체 차액과 구분'])
ws.append(['주의',None,None,None,None,None,'이 표는 공고의 공식 산출내역서가 아닙니다. 실제 공고 서식에 옮겨야 합니다.'])
for row in ws.iter_rows(min_row=2,max_row=19,min_col=2,max_col=5):
    for c in row:c.number_format='#,##0'

ws=sheet('자금일정',['일자·단계','지출 원','수입 원','누적 잔액 원','확정 근거·조건'],[
    ['시작 가용자금',None,None,'=IF(COUNT(C2)=1,C2,"")','C2에 실제 가용자금을 입력'],
]+[[None,None,None,f'=IF(AND(ISNUMBER(D{i-1}),COUNT(B{i}:C{i})=2),D{i-1}+C{i}-B{i},"")',None] for i in range(3,15)]+[
    ['추가 필요자금',None,None,'=IF(COUNT(D2:D14)=13,MAX(0,-MIN(D2:D14)),"")','모든 날짜의 지출·수입이 있어야 계산. 없는 입출금은 0 입력'],
    ['보증 담보·취소 손실',None,None,None,'보험료와 별도로 실제 현금노출을 일정에 반영'],
],{'A':30,'B':23,'C':23,'D':27,'E':80})

ws=sheet('평가점검',['항목','확인된 실제 점수','최고점','최저 구간 가정 예시','판단 근거'],[
    ['학교 실적',None,10,2,'발주처 인정 실적 1건 이하라는 가정'],
    ['수행조직',None,5,2,'인정 인력 3명 이하라는 가정'],
    ['국외여행인솔 자격',None,5,2,'인정 자격 인원 2명 이하라는 가정'],
    ['신용평가',None,10,0,'공고일 전 유효 평가가 없다는 가정'],
    ['정량 합계','=IF(COUNT(B2:B5)=4,SUM(B2:B5),"")',30,'=SUM(D2:D5)','실제 점수는 증빙 대조 후 입력'],
    ['정성 최고 가능',70,70,70,'가정상 최고점이며 실제 취득점수 아님'],
    ['최대 가능점수','=IF(COUNT(B6:B7)=2,SUM(B6:B7),"")',100,'=D6+D7','최저 구간 예시는 76점'],
    ['통과 기준',80,80,80,'서울고 과업·공고 기준'],
    ['점수 검토','=IF(ISNUMBER(B8),IF(B8<B9,"최대점수로도 미달","다른 자격·정성·원가 검토 필요"),"증빙 점수 미입력")',None,'=IF(D8<D9,"최대점수로도 미달","추가 검토")','가격만 낮춰 해결할 수 없음'],
    ['기준일 제약',None,None,None,'공고 후 신규 신용평가를 이번 점수로 확정하지 않음'],
],{'A':26,'B':40,'C':15,'D':32,'E':62})
for rownum,maxval in [(2,10),(3,5),(4,5),(5,10)]:
    dv=DataValidation(type='decimal',operator='between',formula1=0,formula2=maxval)
    dv.errorTitle='점수 범위 확인';dv.error='공고 배점 안의 값을 입력하세요.';dv.showErrorMessage=True
    ws.add_data_validation(dv);dv.add(f'B{rownum}')

sheet('출처',['자료','URL','확인 범위'],[[s['title'],s['url'],s['verified']] for s in json.loads((ROOT/'sources.json').read_text(encoding='utf-8'))['sources']],{'A':36,'B':100,'C':55})
target=OUT/'나라장터-신청준비.xlsx'
wb.save(target)

def table(headers, rows):
    widths = [120] + [380 / (len(headers)-1)] * (len(headers)-1)
    def cell(tag, value, width):
        return f'<{tag} style="width:{width}pt">'+escape(str(value or '미확인'))+f'</{tag}>'
    return '<table style="width:500pt"><thead><tr>'+''.join(cell('th',x,w) for x,w in zip(headers,widths))+'</tr></thead><tbody>'+''.join('<tr>'+''.join(cell('td',x,w) for x,w in zip(row,widths))+'</tr>' for row in rows)+'</tbody></table>'

pages=[
    ('신규 등록부터 준비합니다', '<p class="lead">숲길여행 나라장터 신청 준비</p><p>2026-10-20 · 내부 검토본 · 신청서 저장 완료, 전자서명 대기. 투찰은 하지 않았습니다.</p>'+table(['구분','판단'],[
        ['현재 상태','회사 미등록. 신청서 저장 완료. 기업금융인증서 1년 4,400원 발급 승인 완료. 실제 발급과 은행 본인확인 대기입니다.'],
        ['확인한 업종','국내외여행업. 현재 관광사업등록증 2026-000025와 나라장터 코드 1262를 대조해 신청서에 추가했습니다.'],
        ['준비 완료','입력안·증빙대장·실적표·견적표·자금표·공고 평가표'],
        ['확보한 자료','최신 사업자등록증·관광사업등록증·등기부 등 원본 17개를 비공개 보관'],
        ['확인할 주소','사업자·관광: 등촌동/비원오피스텔. 등기부: 공항동/비엔오스텔. 정정 전'],
        ['다음 경로','범용 공동인증서 또는 사업자용 금융인증서 확인 → 서명·접수·승인 확인'],
    ])+'<p class="note">회원 가입, 회사 등록 승인, 개별 공고 참가자격은 각각 확인합니다. 개인정보가 담긴 원본은 이 양식이나 Git에 넣지 않습니다.</p>'),
    ('회사 정보 입력안',table(['항목','준비값'],[(r[0],r[1]) for r in inputs[:10]])+'<p>모든 값은 최신 원본과 대조합니다. 대표자·사업 연락처·인증서·대리인은 원본과 실제 권한으로 입력합니다. 우편번호는 현재 주소검색으로 확정합니다. 전체 항목은 Excel 등록입력 시트를 사용합니다.</p>'),
    ('등록과 증빙을 연결합니다','<p>개인회원과 업체의 인증은 구분합니다. 사내이사 기록만으로 대표자 권한을 대신하지 않습니다.</p>'+table(['서류','현재','용도'],[(r[0],r[2],r[1]) for r in docs[:10]])+'<p class="note">사업자용 금융인증서도 법인 후보입니다. 기존 인증서 사용 가능 여부를 먼저 확인합니다. 새 인증서·보증 발급·과금은 이번에 실행하지 않았습니다.</p>'),
    ('서울고 공고 검토',table(['항목','확인 내용'],[
        ['공고','R26BK01770779-000 / 일본 방문 체험학습'],
        ['금액·인원','공고 기초금액 46,860,650원 / 학생 26명·교직원 2명'],
        ['마감','등록 10-27 18:00 / 입찰·방문 제안서 10-28 16:00'],
        ['제안','A4 세로·상철 10부 / 11-05 15:10 설명회 예정'],
        ['기본 조건','서울 본점·국내외여행업 또는 종합여행업·소기업 또는 소상공인'],
        ['점수 제약','정량 최저 구간 예시 6 + 정성 최고 70 = 76. 기준 80에 미달'],
        ['주의','위 점수는 조건부 시나리오이며 회사 실제 점수 확정 아님'],
        ['기준일','신용평가는 공고일 전 유효 평가 요구. 지금 발급으로 점수 회복 단정 금지'],
    ])+'<p>학교 실적과 보험·등기 등 인정 인력 증빙, 항공 28석 승계·발권, 현지 수배가 필요합니다. 성인 카페 여행 실적을 학교 실적으로 바꾸지 않습니다.</p>'),
    ('원문 충돌과 돈의 흐름',table(['항목','확인 내용'],[
        ['개찰 시각','공식 상세 11-06 17:00 / 공고 PDF 11-06 10:00'],
        ['실적 기간','공고 최근 5년 / 과업 평가표 2020~2024년'],
        ['입찰 보증','본문 5% 보증서 / 서식에 한시 2.5%·각서 문구 병존'],
        ['대금','과업은 종료 후 청구. 선금과 지급기한 별도 확인 필요'],
        ['계약 보증','10% 이상. 실제 보험료·담보금과 보증금액 구분'],
        ['원가 위험','환율·유류 인상 변경 불가, 인원·할인 정산, 취소·해지 조건'],
    ])+'<p>엑셀의 견적·자금 시트에 공급사 견적과 결제일을 넣습니다. 미입력은 0원이 아닙니다. 전체 차액과 회사 귀속 이익을 구분합니다.</p><p class="note">위 충돌은 발주기관 답변 전 임의로 유리하게 해석하지 않습니다. 문의 초안은 작성했으나 발송하지 않았습니다.</p>'),
    ('작성안을 제출본으로 바꾸는 기준','<p>회사 소개와 과업 대응표는 준비됐습니다. 미확정 인력·숙소·차량·가격을 확정 사실로 채우지 않습니다.</p>'+table(['자료','위치'],[
        ['작업 인덱스','procurement/README.md'],
        ['등록 입력·인증','01-registration-draft.md'],
        ['공고와 점수·계약','02-bid-review.md'],
        ['소개·제안·문의 초안','03-proposal-draft.md'],
        ['사람의 실행 원장','foresttour/docs/사장님-가이드.md 나라장터 절'],
        ['공식 절차','pps.go.kr/kor/content.do?key=00170'],
        ['확인서 발급','sminfo.mss.go.kr'],
        ['나라장터','g2b.go.kr'],
    ])+'<p>신청서 저장과 재조회 검증을 마쳤으며 회사 공동인증서 전자서명을 기다립니다. 실제 송신 완료·접수·승인·입찰 완료 증거는 없습니다.</p>'),
]
css='''@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:"Malgun Gothic",sans-serif;color:#151515;margin:0;font-size:11pt;line-height:1.6}.page{break-after:page;min-height:255mm;position:relative;padding-bottom:12mm}.page:last-child{break-after:auto}h1{font-size:25pt;letter-spacing:-1px;margin:10mm 0 8mm}h2{font-size:17pt}p{margin:5mm 0}.eyebrow{font-size:9pt;letter-spacing:1px;border-top:3px solid #222;padding-top:4mm}.lead{font-size:17pt;font-weight:bold}table{border-collapse:collapse;width:100%;font-size:9.5pt}th,td{border-bottom:1px solid #bbb;padding:3mm 2.5mm;text-align:left;vertical-align:top}th{border-top:1.5px solid #222;font-weight:bold}td:first-child{width:25%;font-weight:bold}.note{border-left:3px solid #333;padding-left:4mm;font-size:10pt}footer{position:absolute;bottom:0;font-size:8pt;color:#555;width:100%;border-top:1px solid #bbb;padding-top:3mm}.summary{width:820px;min-height:0;padding:40px;background:white}.summary h1{margin:12px 0 24px}.summary footer{position:static;margin-top:30px}@media screen{body{background:#e9ede9}.page{background:white;max-width:210mm;margin:20px auto;padding:15mm;min-height:297mm}.summary{margin:0}}'''
def doc(content):return '<!doctype html><html lang="ko"><meta charset="utf-8"><title>나라장터 신청 준비</title><style>'+css+'</style><body>'+content+'</body></html>'
html=''.join('<section class="page"><div class="eyebrow">FOREST TOUR · 신청 준비 · 2026-10-20</div><h1>'+escape(title)+'</h1>'+body+f'<footer>내부 검토본 · 신청서 저장 완료·전자서명 대기 · {i}/6</footer></section>' for i,(title,body) in enumerate(pages,1))
(OUT/'나라장터-신청준비.html').write_text(doc(html),encoding='utf-8')
(OUT/'나라장터-준비요약.html').write_text(doc('<section class="summary"><div class="eyebrow">FOREST TOUR · 2026-10-20</div><h1>'+pages[0][0]+'</h1>'+pages[0][1]+'<footer>상세 입력안·서류 목록·공고 분석은 신청준비 PDF와 Excel에 담았습니다.</footer></section>'),encoding='utf-8')

# 문서 전용 렌더러입니다. 브라우저나 외부 URL에 접근하지 않습니다.
import pymupdf
font_archive = pymupdf.Archive('C:/Windows/Fonts')
print_css = '''@font-face{font-family:malgun;src:url(malgun.ttf)}
body{font-family:malgun;font-size:11pt;line-height:1.5;color:#151515}
h1{font-size:23pt;margin:15pt 0 20pt}p{margin:12pt 0}
table{border-collapse:collapse;width:100%;font-size:10pt}
th,td{border-bottom:0.5pt solid #aaa;padding:7pt;text-align:left;vertical-align:top}
th{border-top:1pt solid #222}
.eyebrow{font-size:8pt;border-top:2pt solid #222;padding-top:8pt}
.lead{font-size:16pt}.note{border-left:2pt solid #333;padding-left:10pt;font-size:9.5pt}
footer{font-size:8pt;margin-top:20pt;color:#555}'''
pdf_path = OUT/'나라장터-신청준비.pdf'
writer = pymupdf.DocumentWriter(str(pdf_path))
for i,(title,body) in enumerate(pages,1):
    fragment = '<div class="eyebrow">FOREST TOUR · 2026-10-20</div><h1>'+escape(title)+'</h1>'+body+f'<footer>내부 검토본 · 신청서 저장 완료·전자서명 대기 · {i}/6</footer>'
    story = pymupdf.Story(fragment, user_css=print_css, archive=font_archive)
    box = pymupdf.Rect(0,0,595.28,841.89)
    more, filled = story.place(box+(42,42,-42,-42))
    if more:
        raise RuntimeError(f'인쇄 {i}쪽의 내용이 페이지를 넘습니다.')
    dev = writer.begin_page(box)
    story.draw(dev)
    writer.end_page()
writer.close()
del writer

preview_css = print_css + 'body{font-size:15pt}h1{font-size:29pt}table{font-size:13pt}th,td{padding:12pt}.note{font-size:13pt}.lead{font-size:21pt}'
story=pymupdf.Story('<h1>'+pages[0][0]+'</h1>'+pages[0][1],user_css=preview_css,archive=font_archive)
preview_box=pymupdf.Rect(0,0,820,2000)
more,filled=story.place(pymupdf.Rect(35,30,785,1965))
assert not more
memory=pymupdf.DocumentWriter(str(OUT/'preview-render.pdf'))
dev=memory.begin_page(preview_box);story.draw(dev);memory.end_page();memory.close()
del dev, memory
preview=pymupdf.open(OUT/'preview-render.pdf')
preview[0].get_pixmap(matrix=pymupdf.Matrix(1.5,1.5),clip=pymupdf.Rect(0,0,820,min(2000,pymupdf.Rect(filled).y1+40))).save(OUT/'나라장터-준비요약.png')
preview.close()
(OUT/'preview-render.pdf').unlink()
pdf_check=pymupdf.open(pdf_path)
assert len(pdf_check)==6
assert all(len(p.get_text().strip())>150 for p in pdf_check)
pdf_check.subset_fonts()
optimized=OUT/'nara-optimized.tmp'
pdf_check.save(optimized,garbage=4,deflate=True)
pdf_check.close()
del pdf_check
optimized.replace(pdf_path)

check=load_workbook(target)
assert len(check.sheetnames)==8
assert check['견적입력']['E16'].value=='=IF(COUNT(E2:E14)=13,SUM(E2:E14),"")'
assert check['평가점검']['B2'].value is None
assert check['자금일정']['D3'].value.startswith('=IF(AND(')
assert 2+2+2+0+70==76 < 80
assert 0+0-1000000==-1000000
print(json.dumps({'workbook':str(target),'sheets':check.sheetnames,'printPages':len(pages),'validation':'PASS','formulaCalculation':'Excel에서 열 때 재계산; 실제 견적·자금은 미입력'},ensure_ascii=False))
