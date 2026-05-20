import ast
import os
import re

seed_file = r'd:\competition\KINDY-MATE\backend\apps\learning\management\commands\seed_curated_content.py'

# We'll just reset the file from git to undo the syntax error first
os.system('git checkout ' + seed_file)

with open(seed_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Define HTML contents for the specific lessons:
html_contents = {
    'Đếm số 1-10 cùng Khan Academy Kids': '''<div class="space-y-6">
  <div class="flex items-center gap-4 rounded-3xl bg-blue-50 p-6 shadow-sm border border-blue-100">
    <div class="text-6xl animate-bounce">🔢</div>
    <div>
      <h2 class="text-2xl font-black text-blue-800">Cùng đếm số nhé!</h2>
      <p class="text-blue-600 font-bold mt-1">Cậu hãy nhìn những hình ảnh dưới đây và đếm to lên nào.</p>
    </div>
  </div>
  
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
    <div class="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transform transition-transform hover:scale-105 cursor-pointer">
      <span class="text-4xl text-rose-500 font-black">1</span>
      <span class="text-3xl mt-2">🍎</span>
      <span class="text-sm font-bold text-slate-500 mt-2">Một quả táo</span>
    </div>
    <div class="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transform transition-transform hover:scale-105 cursor-pointer">
      <span class="text-4xl text-orange-500 font-black">2</span>
      <span class="text-3xl mt-2">🦆🦆</span>
      <span class="text-sm font-bold text-slate-500 mt-2">Hai con vịt</span>
    </div>
    <div class="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transform transition-transform hover:scale-105 cursor-pointer">
      <span class="text-4xl text-amber-500 font-black">3</span>
      <span class="text-3xl mt-2">⭐⭐⭐</span>
      <span class="text-sm font-bold text-slate-500 mt-2">Ba ngôi sao</span>
    </div>
    <div class="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transform transition-transform hover:scale-105 cursor-pointer">
      <span class="text-4xl text-emerald-500 font-black">4</span>
      <span class="text-3xl mt-2">🎈🎈🎈🎈</span>
      <span class="text-sm font-bold text-slate-500 mt-2">Bốn quả bóng</span>
    </div>
    <div class="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transform transition-transform hover:scale-105 cursor-pointer">
      <span class="text-4xl text-sky-500 font-black">5</span>
      <span class="text-3xl mt-2">🦋🦋🦋🦋🦋</span>
      <span class="text-sm font-bold text-slate-500 mt-2">Năm chú bướm</span>
    </div>
  </div>
  
  <div class="rounded-3xl bg-gradient-to-r from-amber-100 to-orange-100 p-6 text-center shadow-sm">
    <p class="text-xl font-black text-amber-900">Giỏi quá! Cậu đã đếm được đến 5 rồi. Nghỉ tay một lát rồi mình lại tiếp tục nha!</p>
  </div>
</div>''',

    'Cộng trừ đơn giản: Nhóm đồ vật': '''<div class="space-y-6">
  <div class="rounded-3xl bg-emerald-50 p-6 border border-emerald-100 shadow-sm text-center">
    <h2 class="text-2xl font-black text-emerald-800">Cộng đồ vật vui vẻ!</h2>
    <p class="text-emerald-600 font-bold mt-2">Chúng ta cùng làm phép cộng bằng hình ảnh nhé.</p>
  </div>
  
  <div class="flex flex-col gap-6">
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-center gap-6">
      <div class="text-4xl bg-rose-50 p-4 rounded-3xl border border-rose-100">🍎🍎</div>
      <div class="text-3xl font-black text-slate-400">+</div>
      <div class="text-4xl bg-rose-50 p-4 rounded-3xl border border-rose-100">🍎</div>
      <div class="text-3xl font-black text-slate-400">=</div>
      <div class="text-5xl font-black text-emerald-500 animate-pulse">?</div>
    </div>
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-center gap-6">
      <div class="text-4xl bg-amber-50 p-4 rounded-3xl border border-amber-100">🚗🚗🚗</div>
      <div class="text-3xl font-black text-slate-400">-</div>
      <div class="text-4xl bg-amber-50 p-4 rounded-3xl border border-amber-100">🚗</div>
      <div class="text-3xl font-black text-slate-400">=</div>
      <div class="text-5xl font-black text-emerald-500 animate-pulse">?</div>
    </div>
  </div>
  
  <p class="text-center text-slate-500 font-bold">Hãy nhẩm thử xem đáp án là mấy rồi bấm nút hoàn thành nhé!</p>
</div>''',

    'Đọc hiểu truyện ngắn: Mặt trời nhỏ': '''<div class="space-y-6">
  <div class="rounded-3xl bg-amber-50 p-6 border border-amber-100 flex items-center gap-4">
    <div class="text-6xl animate-pulse">☀️</div>
    <h2 class="text-3xl font-black text-amber-800">Mặt trời nhỏ của mẹ</h2>
  </div>
  
  <div class="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-lg leading-relaxed text-slate-700 font-bold">
    <p class="mb-4">Buổi sáng, bé Na thức dậy sớm. Na chạy ra vườn, thấy một bông hoa hướng dương đang nở rộ.</p>
    <p class="mb-4">Mẹ bảo: "Bông hoa ấy giống hệt Na, lúc nào cũng tươi tắn đón ánh mặt trời."</p>
    <p>Na cười tít mắt. Từ hôm đó, Na luôn tưới nước cho hoa mỗi ngày để cả hai cùng lớn lên thật khỏe mạnh.</p>
  </div>
  
  <div class="rounded-3xl bg-blue-50 p-6 border border-blue-100">
    <h3 class="text-xl font-black text-blue-800 mb-4">✍️ Câu hỏi cho cậu nè:</h3>
    <ul class="space-y-3 list-none pl-0">
      <li class="flex items-start gap-3"><span class="text-blue-500 text-xl font-black">1.</span> <span class="font-bold text-slate-700">Na thấy bông hoa gì trong vườn?</span></li>
      <li class="flex items-start gap-3"><span class="text-blue-500 text-xl font-black">2.</span> <span class="font-bold text-slate-700">Mẹ nói Na giống bông hoa ở điểm nào?</span></li>
      <li class="flex items-start gap-3"><span class="text-blue-500 text-xl font-black">3.</span> <span class="font-bold text-slate-700">Na làm gì mỗi ngày để giúp hoa lớn?</span></li>
    </ul>
  </div>
</div>''',

    'Khám phá vòng đời bướm': '''<div class="space-y-6">
  <div class="rounded-3xl bg-gradient-to-r from-green-100 to-emerald-100 p-8 text-center shadow-sm">
    <h2 class="text-3xl font-black text-emerald-900 mb-2">Vòng Đời Của Bướm 🦋</h2>
    <p class="text-emerald-700 font-bold">Làm sao một con sâu nhỏ có thể biến thành chú bướm bay lượn?</p>
  </div>
  
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div class="text-5xl mb-4">🥚</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">1. Trứng</h3>
      <p class="text-slate-600 font-bold">Bướm mẹ đẻ những quả trứng nhỏ xíu xiu trên lá cây.</p>
    </div>
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div class="text-5xl mb-4">🐛</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">2. Sâu bướm</h3>
      <p class="text-slate-600 font-bold">Sâu nở ra và ăn lá cây liên tục để lớn thật nhanh.</p>
    </div>
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div class="text-5xl mb-4">🍃</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">3. Nhộng (Kén)</h3>
      <p class="text-slate-600 font-bold">Sâu tự bọc mình trong một cái kén cứng và ngủ một giấc dài.</p>
    </div>
    <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div class="text-5xl mb-4 animate-bounce">🦋</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">4. Bướm trưởng thành</h3>
      <p class="text-slate-600 font-bold">Cái kén nứt ra, một chú bướm xinh đẹp chui ra và vỗ cánh bay đi!</p>
    </div>
  </div>
</div>''',

    'English basics: Animals & Colors': '''<div class="space-y-6">
  <div class="rounded-3xl bg-indigo-50 p-6 border border-indigo-100 flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-black text-indigo-800">Animals & Colors</h2>
      <p class="text-indigo-600 font-bold mt-1">Học tiếng Anh thật vui!</p>
    </div>
    <div class="text-5xl animate-wiggle">🐶</div>
  </div>
  
  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col items-center justify-center p-6 bg-red-50 rounded-3xl border border-red-100 text-center">
      <span class="text-5xl mb-3">🍎</span>
      <span class="text-xl font-black text-red-600 uppercase tracking-widest">RED</span>
      <span class="text-sm font-bold text-red-400 mt-1">Màu đỏ</span>
    </div>
    <div class="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-3xl border border-blue-100 text-center">
      <span class="text-5xl mb-3">🌊</span>
      <span class="text-xl font-black text-blue-600 uppercase tracking-widest">BLUE</span>
      <span class="text-sm font-bold text-blue-400 mt-1">Màu xanh dương</span>
    </div>
    <div class="flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-3xl border border-yellow-100 text-center">
      <span class="text-5xl mb-3">🐱</span>
      <span class="text-xl font-black text-yellow-600 uppercase tracking-widest">CAT</span>
      <span class="text-sm font-bold text-yellow-500 mt-1">Con mèo</span>
    </div>
    <div class="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
      <span class="text-5xl mb-3">🐸</span>
      <span class="text-xl font-black text-emerald-600 uppercase tracking-widest">FROG</span>
      <span class="text-sm font-bold text-emerald-400 mt-1">Con ếch</span>
    </div>
  </div>
  
  <div class="rounded-3xl bg-slate-50 p-5 text-center font-bold text-slate-600 border border-slate-200">
    <p>Hãy đọc to các từ tiếng Anh ở trên nhé: <strong class="text-indigo-600">Red, Blue, Cat, Frog!</strong></p>
  </div>
</div>''',

    'Vẽ tranh: Con vật yêu thích': '''<div class="space-y-6">
  <div class="rounded-3xl bg-fuchsia-50 p-6 border border-fuchsia-100 text-center">
    <div class="text-6xl mb-4 animate-bounce">🎨</div>
    <h2 class="text-3xl font-black text-fuchsia-800">Trạm Sáng Tạo</h2>
    <p class="text-fuchsia-600 font-bold mt-2">Họa sĩ nhí hãy trổ tài nào!</p>
  </div>
  
  <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
    <ul class="space-y-4">
      <li class="flex items-center gap-4">
        <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-full text-xl font-black">1</div>
        <p class="font-bold text-slate-700 text-lg">Chuẩn bị giấy trắng, bút chì và sáp màu hoặc màu nước.</p>
      </li>
      <li class="flex items-center gap-4">
        <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-full text-xl font-black">2</div>
        <p class="font-bold text-slate-700 text-lg">Nghĩ về con vật cậu thích nhất (mèo, cún, sư tử, khủng long...).</p>
      </li>
      <li class="flex items-center gap-4">
        <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-full text-xl font-black">3</div>
        <p class="font-bold text-slate-700 text-lg">Vẽ thật thoải mái, không sợ sai! Hãy tô màu thật rực rỡ.</p>
      </li>
      <li class="flex items-center gap-4">
        <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-full text-xl font-black">4</div>
        <p class="font-bold text-slate-700 text-lg">Khi vẽ xong, hãy nhờ bố mẹ chụp lại tác phẩm và khoe nhé.</p>
      </li>
    </ul>
  </div>
</div>''',

    '5 phút nhảy tại chỗ (Jumping Jacks nhẹ)': '''<div class="space-y-6 text-center">
  <div class="rounded-3xl bg-rose-50 p-8 border border-rose-100 shadow-sm">
    <div class="text-6xl animate-bounce mb-4">🏃‍♂️</div>
    <h2 class="text-3xl font-black text-rose-800 mb-2">Nhảy Jumping Jacks!</h2>
    <p class="text-rose-600 font-bold">Cùng làm cơ thể nóng lên và khỏe mạnh nào!</p>
  </div>
  
  <div class="grid sm:grid-cols-2 gap-4">
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div class="text-5xl mb-3">🧍</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">Bước 1: Chuẩn bị</h3>
      <p class="text-slate-600 font-bold">Đứng thẳng, hai chân khép lại, hai tay xuôi theo người.</p>
    </div>
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div class="text-5xl mb-3">🤸</div>
      <h3 class="text-xl font-black text-slate-800 mb-2">Bước 2: Bật nhảy</h3>
      <p class="text-slate-600 font-bold">Bật nhảy dang rộng hai chân, đồng thời vung hai tay vòng lên đầu.</p>
    </div>
  </div>
  
  <div class="rounded-3xl bg-blue-50 p-6 text-blue-800 font-black text-xl">
    Làm như vậy 15 lần rồi nghỉ một chút nhé. Cố lên!
  </div>
</div>'''
}

for title, html_body in html_contents.items():
    # Use triple double quotes for multi-line string in python dict
    escaped_html = '"""' + html_body + '"""'
    
    # regex to find the dict in CONTENT array that has 'title': '...' and inject 'content_body': """...""",
    pattern = r"(\{'title': '" + re.escape(title) + r"',)"
    replacement = r"\1 'content_body': " + escaped_html + r","
    content = re.sub(pattern, replacement, content)

with open(seed_file, 'w', encoding='utf-8') as f:
    f.write(content)
