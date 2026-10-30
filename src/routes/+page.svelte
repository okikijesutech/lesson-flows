<script lang="ts">
    import { onMount } from 'svelte';
    import type { CurriculumNode, LessonNote, ChalkboardSection } from '../lib/types.js';

    // State Variables using Svelte 5 Runes
    let activeTab = $state<'generator' | 'reader' | 'library' | 'branding'>('generator');
    let readerSubTab = $state<'chalkboard' | 'lesson_plan'>('chalkboard');
    let readerFontSize = $state<'normal' | 'large' | 'xl'>('normal');

    let readerTextClass = $derived(
        readerFontSize === 'xl' ? 'text-lg leading-relaxed' :
        readerFontSize === 'large' ? 'text-base leading-normal' :
        'text-sm leading-normal'
    );
    let classes = $state<string[]>([]);
    let selectedClass = $state<string>('');
    let selectedTerm = $state<number>(1);
    let subjects = $state<string[]>([]);
    let selectedSubject = $state<string>('');
    let weeks = $state<CurriculumNode[]>([]);
    let selectedWeekId = $state<string>('');
    let selectedDuration = $state<string>('40 Minutes (Single Period)');
    let customInstructions = $state<string>('');
    
    let isGenerating = $state<boolean>(false);
    let currentNote = $state<LessonNote | null>(null);
    let library = $state<LessonNote[]>([]);

    // School Branding Configuration State
    let schoolName = $state<string>("St. Saviour's International College, Lagos");
    let schoolMotto = $state<string>('Labor Omnia Vincit (Excellence in Diligence)');
    let academicSession = $state<string>('2026/2027 Academic Session');

    // Selected week node preview
    let selectedNode = $derived(weeks.find(w => w.id === selectedWeekId));

    // Dynamic API Base URL (configured via VITE_API_URL on Vercel)
    const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    function apiUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return `${API_BASE}${cleanPath}`;
    }

    onMount(() => {
        loadClasses();
        loadSavedBranding();
    });

    async function loadClasses() {
        try {
            const res = await fetch(apiUrl('/api/v1/curriculum/classes'));
            if (res.ok) {
                classes = await res.json();
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    }

    async function handleClassChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        selectedClass = val;
        selectedSubject = '';
        selectedWeekId = '';
        weeks = [];
        subjects = [];

        if (!val) return;
        try {
            const res = await fetch(apiUrl(`/api/v1/curriculum/subjects?class_level=${encodeURIComponent(val)}`));
            if (res.ok) {
                subjects = await res.json();
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    }

    async function loadWeeks() {
        selectedWeekId = '';
        weeks = [];
        if (!selectedClass || !selectedSubject) return;

        try {
            const url = `/api/v1/curriculum/weeks?class_level=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}&term=${selectedTerm}`;
            const res = await fetch(apiUrl(url));
            if (res.ok) {
                weeks = await res.json();
            }
        } catch (err) {
            console.error('Error fetching weeks:', err);
        }
    }

    async function generateDocument() {
        if (!selectedWeekId) {
            alert('Please select a class, subject, and syllabus topic.');
            return;
        }

        isGenerating = true;
        try {
            const payload = {
                curriculum_node_id: selectedWeekId,
                duration: selectedDuration,
                custom_instructions: customInstructions
            };

            const res = await fetch(apiUrl('/api/v1/notes/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to generate lesson note.');

            const note: LessonNote = await res.json();
            currentNote = note;
            library = [note, ...library];
        } catch (err: any) {
            alert(err.message || 'Error occurred while generating.');
        } finally {
            isGenerating = false;
        }
    }

    function copyChalkboard() {
        if (!currentNote) return;
        const c = currentNote.content_json;
        let text = `📚 *${c.lesson_plan.subject.toUpperCase()} NOTES*\n`;
        text += `*Class:* ${c.lesson_plan.class_level} | *Week:* ${c.lesson_plan.week}\n`;
        text += `*Topic:* ${c.lesson_plan.topic}\n\n`;

        c.chalkboard_content.sections.forEach((sec: ChalkboardSection) => {
            text += `*${sec.heading}*\n`;
            sec.content.forEach((line: string) => {
                text += `${line}\n`;
            });
            text += `\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Chalkboard notes copied! Ready to paste into WhatsApp.');
        });
    }

    function saveBranding() {
        localStorage.setItem('school_name', schoolName);
        localStorage.setItem('school_motto', schoolMotto);
        localStorage.setItem('school_session', academicSession);
        alert('✅ Branding preferences saved for all exported PDFs!');
    }

    function loadSavedBranding() {
        const n = localStorage.getItem('school_name');
        const m = localStorage.getItem('school_motto');
        const s = localStorage.getItem('school_session');
        if (n) schoolName = n;
        if (m) schoolMotto = m;
        if (s) academicSession = s;
    }
</script>

<div class="min-h-screen bg-slate-100 text-slate-800 pb-16 font-sans">
    <!-- Header -->
    <header class="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white shadow-md sticky top-0 z-30">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
                <span class="text-2xl bg-white/10 p-1.5 rounded-lg">📚</span>
                <div>
                    <h1 class="font-extrabold text-base tracking-wide flex items-center gap-2">
                        Lagos Teacher Assistant
                        <span class="text-[10px] bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full font-bold">SvelteKit PWA</span>
                    </h1>
                    <p class="text-xs text-emerald-200">NERDC Standards & Lagos Unified Schemes Aligned</p>
                </div>
            </div>
            <div class="text-xs bg-emerald-800/80 border border-emerald-600 px-3 py-1 rounded-full text-emerald-100 flex items-center gap-1.5 font-medium">
                <span>🛡️</span> Lagos Scheme Verified
            </div>
        </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 mt-4">
        <!-- Navigation Tabs -->
        <div class="flex border-b border-slate-300 gap-1 sm:gap-2 mb-4 overflow-x-auto">
            <button
                class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap {activeTab === 'generator' ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}"
                onclick={() => activeTab = 'generator'}
            >
                📝 Generate Note
            </button>
            <button
                class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap flex items-center gap-1.5 {activeTab === 'reader' ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}"
                onclick={() => activeTab = 'reader'}
            >
                📖 Read Note
                {#if currentNote}
                    <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                {/if}
            </button>
            <button
                class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap {activeTab === 'library' ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}"
                onclick={() => activeTab = 'library'}
            >
                📚 Saved Library ({library.length})
            </button>
            <button
                class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap {activeTab === 'branding' ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}"
                onclick={() => activeTab = 'branding'}
            >
                🏫 School Branding
            </button>
        </div>

        {#if activeTab === 'generator'}
            <!-- Generator Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
                <h2 class="text-emerald-900 font-bold text-sm mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span>🎯</span> Select Class Level & Syllabus Topic
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label for="class-select" class="block text-xs font-semibold text-slate-600 mb-1">Class Level</label>
                        <select
                            id="class-select"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            onchange={handleClassChange}
                        >
                            <option value="">-- Choose Class --</option>
                            {#each classes as c}
                                <option value={c}>{c}</option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label for="term-select" class="block text-xs font-semibold text-slate-600 mb-1">Academic Term</label>
                        <select
                            id="term-select"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={selectedTerm}
                            onchange={loadWeeks}
                        >
                            <option value={1}>1st Term (Active)</option>
                            <option value={2}>2nd Term</option>
                            <option value={3}>3rd Term</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label for="subject-select" class="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                    <select
                        id="subject-select"
                        class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        bind:value={selectedSubject}
                        disabled={!selectedClass}
                        onchange={loadWeeks}
                    >
                        <option value="">-- Choose Subject --</option>
                        {#each subjects as s}
                            <option value={s}>{s}</option>
                        {/each}
                    </select>
                </div>

                <div class="mb-3">
                    <label for="week-select" class="block text-xs font-semibold text-slate-600 mb-1">Week & Syllabus Topic</label>
                    <select
                        id="week-select"
                        class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        bind:value={selectedWeekId}
                        disabled={!selectedSubject || weeks.length === 0}
                    >
                        <option value="">-- Choose Week / Topic --</option>
                        {#each weeks as w}
                            <option value={w.id}>
                                Week {w.week}: {w.topic} {w.continuity_type === 'continuation' ? ' [Part II / Continuation]' : ''}
                            </option>
                        {/each}
                    </select>

                    {#if selectedNode}
                        <div class="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            {#if selectedNode.continuity_type === 'continuation'}
                                <span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                                    🔄 Continuation (Scaffolded from Previous Week)
                                </span>
                            {:else if selectedNode.continuity_type === 'spiral_deepening'}
                                <span class="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                                    📈 Spiral Progression (Advanced JSS2 Standard)
                                </span>
                            {:else}
                                <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                                    🌱 New Foundational Concept
                                </span>
                            {/if}
                            <p class="text-slate-600 mt-0.5">
                                <span class="font-semibold text-slate-800">Entry Knowledge:</span>
                                {selectedNode.previous_topic_recap || 'General daily observation'}
                            </p>
                        </div>
                    {/if}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label for="duration-select" class="block text-xs font-semibold text-slate-600 mb-1">Period Duration</label>
                        <select
                            id="duration-select"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={selectedDuration}
                        >
                            <option value="40 Minutes (Single Period)">40 Minutes (Single Period)</option>
                            <option value="80 Minutes (Double Period)">80 Minutes (Double Period)</option>
                        </select>
                    </div>

                    <div>
                        <label for="custom-instructions" class="block text-xs font-semibold text-slate-600 mb-1">Special Instructions (Optional)</label>
                        <input
                            type="text"
                            id="custom-instructions"
                            placeholder="e.g. Focus on local examples in Lagos"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={customInstructions}
                        />
                    </div>
                </div>

                <button
                    class="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    disabled={isGenerating || !selectedWeekId}
                    onclick={generateDocument}
                >
                    {#if isGenerating}
                        <span class="animate-spin text-lg">⏳</span>
                        <span>Applying Lagos State Unified Scheme...</span>
                    {:else}
                        <span>🚀 Generate Complete Lesson Document</span>
                    {/if}
                </button>
            </div>

            <!-- Result Display -->
            {#if currentNote}
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
                    <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200 mb-4">
                        <div>
                            <span class="text-xs font-bold text-emerald-800 uppercase tracking-wide">Inspection-Ready Document</span>
                            <h3 class="text-base font-bold text-slate-900">
                                {currentNote.class_level} {currentNote.subject} (Week {currentNote.week})
                            </h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                onclick={() => activeTab = 'reader'}
                                class="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                                📖 Read in App
                            </button>
                            <a
                                href={apiUrl(currentNote.pdf_url)}
                                target="_blank"
                                class="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                                📥 Download PDF
                            </a>
                            <a
                                href={apiUrl(currentNote.html_url)}
                                target="_blank"
                                class="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                                👁️ Full View
                            </a>
                            <button
                                onclick={copyChalkboard}
                                class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                                📋 Copy Notes
                            </button>
                        </div>
                    </div>

                    <!-- Document Layout Preview -->
                    <div class="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                        <div class="text-center pb-3 border-b-2 border-emerald-900 mb-3">
                            <h4 class="font-extrabold text-emerald-950 text-base">{currentNote.content_json.school.name}</h4>
                            <p class="text-xs italic text-slate-500">"{currentNote.content_json.school.motto}"</p>
                            <span class="text-[11px] font-bold text-emerald-800 inline-block mt-1 bg-emerald-100 px-2 py-0.5 rounded">
                                {currentNote.content_json.school.term} | {currentNote.content_json.school.session}
                            </span>
                        </div>

                        <div class="bg-emerald-800 text-white font-bold text-xs uppercase px-2.5 py-1 rounded mb-2">
                            Part A: Statutory Lesson Plan (Teacher's Administrative Record)
                        </div>

                        <div class="overflow-x-auto mb-3">
                            <table class="w-full text-xs border-collapse border border-slate-300">
                                <tbody>
                                    <tr class="border-b border-slate-300">
                                        <td class="p-1.5 font-bold bg-emerald-50 text-emerald-900 w-1/4">Subject</td>
                                        <td class="p-1.5">{currentNote.content_json.lesson_plan.subject}</td>
                                        <td class="p-1.5 font-bold bg-emerald-50 text-emerald-900 w-1/4">Class</td>
                                        <td class="p-1.5">{currentNote.content_json.lesson_plan.class_level}</td>
                                    </tr>
                                    <tr class="border-b border-slate-300">
                                        <td class="p-1.5 font-bold bg-emerald-50 text-emerald-900">Topic</td>
                                        <td colspan="3" class="p-1.5 font-bold">{currentNote.content_json.lesson_plan.topic}</td>
                                    </tr>
                                    <tr class="border-b border-slate-300">
                                        <td class="p-1.5 font-bold bg-emerald-50 text-emerald-900">Behavioral Objectives</td>
                                        <td colspan="3" class="p-1.5">
                                            <ul class="list-disc pl-4 space-y-0.5">
                                                {#each currentNote.content_json.lesson_plan.behavioral_objectives as obj}
                                                    <li>{obj}</li>
                                                {/each}
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="bg-indigo-900 text-white font-bold text-xs uppercase px-2.5 py-1 rounded mb-2">
                            Part B: Student Chalkboard Content (Notes for Students to Copy)
                        </div>

                        <div class="bg-white border-1.5 border-indigo-900 rounded p-3 text-xs space-y-2">
                            {#each currentNote.content_json.chalkboard_content.sections as sec}
                                <div>
                                    <h5 class="font-bold text-indigo-900 underline">{sec.heading}</h5>
                                    <ul class="list-disc pl-4 space-y-0.5 text-slate-700 mt-1">
                                        {#each sec.content as line}
                                            <li>{line}</li>
                                        {/each}
                                    </ul>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

        {:else if activeTab === 'reader'}
            <!-- Dedicated In-App Lesson Note Reader -->
            {#if !currentNote}
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-md mx-auto my-6">
                    <span class="text-4xl block mb-3">📖</span>
                    <h3 class="text-base font-bold text-slate-800 mb-1">No Note Open for Reading</h3>
                    <p class="text-xs text-slate-500 mb-4">
                        Generate a new lesson note or pick an existing one from your Saved Library to read directly in the app.
                    </p>
                    <button
                        onclick={() => activeTab = 'generator'}
                        class="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                    >
                        📝 Go to Note Generator
                    </button>
                </div>
            {:else}
                {@const lp = currentNote.content_json.lesson_plan}
                {@const cb = currentNote.content_json.chalkboard_content}
                {@const sch = currentNote.content_json.school}

                <div class="space-y-4 mb-10">
                    <!-- Top Reader Control Bar -->
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 flex items-center justify-between flex-wrap gap-3">
                        <!-- Sub-tab switcher -->
                        <div class="flex items-center bg-slate-100 p-1 rounded-lg">
                            <button
                                class="px-3 py-1.5 text-xs font-bold rounded-md transition {readerSubTab === 'chalkboard' ? 'bg-indigo-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                                onclick={() => readerSubTab = 'chalkboard'}
                            >
                                📝 Chalkboard Content
                            </button>
                            <button
                                class="px-3 py-1.5 text-xs font-bold rounded-md transition {readerSubTab === 'lesson_plan' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                                onclick={() => readerSubTab = 'lesson_plan'}
                            >
                                📑 Statutory Plan
                            </button>
                        </div>

                        <!-- Font Size & Actions -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <!-- Font size selector -->
                            <div class="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'normal' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'}"
                                    onclick={() => readerFontSize = 'normal'}
                                    title="Normal font"
                                >
                                    A
                                </button>
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'large' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'}"
                                    onclick={() => readerFontSize = 'large'}
                                    title="Large font"
                                >
                                    A+
                                </button>
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'xl' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'}"
                                    onclick={() => readerFontSize = 'xl'}
                                    title="Extra Large font"
                                >
                                    A++
                                </button>
                            </div>

                            <button
                                onclick={copyChalkboard}
                                class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                                title="Copy Chalkboard Notes"
                            >
                                📋 Copy
                            </button>
                            <a
                                href={apiUrl(currentNote.pdf_url)}
                                target="_blank"
                                class="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                            >
                                📥 PDF
                            </a>
                        </div>
                    </div>

                    <!-- Reader Paper Card -->
                    <div class="bg-white rounded-xl shadow-md border border-slate-200 p-5 sm:p-8 max-w-3xl mx-auto">
                        <!-- Stamped School Header -->
                        <div class="text-center pb-4 border-b-2 border-emerald-900 mb-6">
                            <span class="text-2xl">🏫</span>
                            <h2 class="font-extrabold text-emerald-950 text-lg sm:text-xl tracking-tight uppercase mt-1">
                                {sch.name}
                            </h2>
                            <p class="text-xs italic text-slate-500 font-medium">"{sch.motto}"</p>
                            <div class="flex items-center justify-center gap-2 mt-2">
                                <span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                    {sch.term} • {sch.session}
                                </span>
                                <span class="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                                    Lagos Unified NERDC Standard
                                </span>
                            </div>
                        </div>

                        <!-- Content Switch: Chalkboard vs Statutory Plan -->
                        {#if readerSubTab === 'chalkboard'}
                            <!-- Chalkboard View (Student Notes for Blackboard) -->
                            <div class="space-y-6">
                                <div class="bg-indigo-950 text-white p-3.5 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p class="text-[10px] tracking-widest uppercase font-bold text-indigo-300">Classroom Blackboard Notes</p>
                                        <h3 class="font-black text-base sm:text-lg text-white">
                                            {lp.subject.toUpperCase()}: {lp.topic}
                                        </h3>
                                    </div>
                                    <span class="text-xs font-extrabold bg-indigo-800 px-2.5 py-1 rounded">
                                        {lp.class_level} • Wk {lp.week}
                                    </span>
                                </div>

                                <div class="border-2 border-slate-200 rounded-lg p-4 sm:p-6 bg-slate-50/60 {readerTextClass}">
                                    {#each cb.sections as sec, idx}
                                        <div class="mb-6 last:mb-0">
                                            <h4 class="font-bold text-indigo-950 flex items-center gap-2 border-b border-indigo-200 pb-1 mb-2">
                                                <span class="text-xs bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-black">{idx + 1}</span>
                                                {sec.heading}
                                            </h4>
                                            <ul class="list-disc pl-5 space-y-2 text-slate-800">
                                                {#each sec.content as line}
                                                    <li>{line}</li>
                                                {/each}
                                            </ul>
                                        </div>
                                    {/each}
                                </div>

                                <!-- Take-Home Assignment Box -->
                                <div class="bg-amber-50 border border-amber-300 rounded-lg p-4 {readerTextClass}">
                                    <h4 class="font-bold text-amber-900 text-sm flex items-center gap-1.5 mb-1">
                                        <span>✍️</span> Take-Home Assignment / Evaluation
                                    </h4>
                                    <p class="text-amber-950 font-medium pl-5">
                                        {lp.assignment || 'Review today’s key takeaways and complete all chapter review questions in your exercise books.'}
                                    </p>
                                </div>
                            </div>

                        {:else}
                            <!-- Statutory Lesson Plan (Administrative Table View) -->
                            <div class="space-y-5 {readerTextClass}">
                                <div class="bg-emerald-900 text-white p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p class="text-[10px] uppercase font-bold text-emerald-200">Official Administrative Lesson Plan</p>
                                        <h3 class="font-black text-base sm:text-lg text-white">{lp.topic}</h3>
                                    </div>
                                    <span class="text-xs font-bold bg-emerald-800 px-2.5 py-1 rounded">
                                        Duration: {lp.duration}
                                    </span>
                                </div>

                                <!-- Administrative Table -->
                                <div class="overflow-x-auto border border-slate-300 rounded-lg">
                                    <table class="w-full text-xs sm:text-sm border-collapse">
                                        <tbody>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700 w-1/4">Subject</td>
                                                <td class="p-2 font-semibold text-slate-900">{lp.subject}</td>
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700 w-1/4">Class Level</td>
                                                <td class="p-2 font-semibold text-slate-900">{lp.class_level}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Week / Term</td>
                                                <td class="p-2 text-slate-900">Week {lp.week} (First Term)</td>
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Average Age</td>
                                                <td class="p-2 text-slate-900">{lp.average_age || '11 - 13 Years'}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Continuity Type</td>
                                                <td colspan="3" class="p-2 text-slate-900 capitalize font-medium">{lp.continuity_type || 'New Concept'}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Previous Knowledge</td>
                                                <td colspan="3" class="p-2 text-slate-800">{lp.entry_behavior || 'Students have baseline familiarity with the introductory concepts from the prior week.'}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Instructional Aids</td>
                                                <td colspan="3" class="p-2 text-slate-800">
                                                    {#if lp.instructional_materials && lp.instructional_materials.length}
                                                        <ul class="list-disc pl-4 space-y-0.5">
                                                            {#each lp.instructional_materials as mat}
                                                                <li>{mat}</li>
                                                            {/each}
                                                        </ul>
                                                    {:else}
                                                        Whiteboard, chalkboard, textbook diagrams, and real-life examples.
                                                    {/if}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="p-2 font-bold bg-slate-100 text-slate-700">Behavioural Objectives</td>
                                                <td colspan="3" class="p-2 text-slate-800">
                                                    <p class="text-[11px] font-bold text-slate-500 mb-1">By the end of the lesson, learners will be able to:</p>
                                                    <ul class="list-disc pl-4 space-y-1">
                                                        {#each lp.behavioral_objectives as obj}
                                                            <li>{obj}</li>
                                                        {/each}
                                                    </ul>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Presentation Steps Grid -->
                                <div>
                                    <h4 class="font-bold text-emerald-950 text-sm mb-2 flex items-center gap-1.5">
                                        <span>📊</span> Step-by-Step Lesson Presentation
                                    </h4>
                                    <div class="overflow-x-auto border border-slate-300 rounded-lg">
                                        <table class="w-full text-xs sm:text-sm border-collapse">
                                            <thead>
                                                <tr class="bg-emerald-800 text-white text-left font-bold">
                                                    <th class="p-2 border border-emerald-900 w-16">Step</th>
                                                    <th class="p-2 border border-emerald-900">Teacher's Activities</th>
                                                    <th class="p-2 border border-emerald-900">Students' Activities</th>
                                                    <th class="p-2 border border-emerald-900 w-24">Method</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each lp.presentation_steps as step}
                                                    <tr class="border-b border-slate-200 odd:bg-slate-50/50">
                                                        <td class="p-2 font-bold text-emerald-900 border border-slate-200">{step.step_number}</td>
                                                        <td class="p-2 text-slate-800 border border-slate-200">{step.teacher_activity}</td>
                                                        <td class="p-2 text-slate-800 border border-slate-200">{step.student_activity}</td>
                                                        <td class="p-2 text-slate-600 font-medium border border-slate-200">{step.method}</td>
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Evaluation & Summary -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div class="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                        <h5 class="font-bold text-xs text-slate-800 uppercase mb-1">🎯 Evaluation Questions</h5>
                                        <ul class="list-decimal pl-4 space-y-1 text-slate-700 text-xs">
                                            {#each lp.evaluation_questions as q}
                                                <li>{q}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                    <div class="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                        <h5 class="font-bold text-xs text-slate-800 uppercase mb-1">📝 Conclusion & Assignment</h5>
                                        <p class="text-xs text-slate-700 mb-2"><strong>Summary:</strong> {lp.summary}</p>
                                        <p class="text-xs text-slate-800 font-semibold"><strong>Assignment:</strong> {lp.assignment}</p>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

        {:else if activeTab === 'library'}
            <!-- Library View -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h2 class="text-emerald-900 font-bold text-sm mb-3">📚 Your Saved Lesson Notes</h2>
                {#if library.length === 0}
                    <p class="text-xs text-slate-500">No notes generated yet in this session.</p>
                {:else}
                    <div class="space-y-2">
                        {#each library as n}
                            <div class="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-emerald-300 transition">
                                <div>
                                    <p class="text-xs font-bold text-slate-900">{n.class_level} - {n.subject} (Week {n.week})</p>
                                    <p class="text-[11px] text-slate-500">{n.topic}</p>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button
                                        onclick={() => { currentNote = n; activeTab = 'reader'; }}
                                        class="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-2.5 py-1 rounded shadow-xs"
                                    >
                                        📖 Read
                                    </button>
                                    <a href={apiUrl(n.pdf_url)} target="_blank" class="bg-emerald-800 text-white text-xs font-bold px-2.5 py-1 rounded">PDF</a>
                                    <a href={apiUrl(n.html_url)} target="_blank" class="bg-slate-700 text-white text-xs font-bold px-2.5 py-1 rounded">View</a>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

        {:else if activeTab === 'branding'}
            <!-- Branding Configuration -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h2 class="text-emerald-900 font-bold text-sm mb-2">🏫 School Header & Branding Settings</h2>
                <p class="text-xs text-slate-500 mb-4">Customize your school header. All exported PDFs will automatically feature these details at the top.</p>

                <div class="space-y-3">
                    <div>
                        <label for="cfg-school-name" class="block text-xs font-semibold text-slate-600 mb-1">School Name</label>
                        <input
                            type="text"
                            id="cfg-school-name"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={schoolName}
                        />
                    </div>
                    <div>
                        <label for="cfg-school-motto" class="block text-xs font-semibold text-slate-600 mb-1">School Motto</label>
                        <input
                            type="text"
                            id="cfg-school-motto"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={schoolMotto}
                        />
                    </div>
                    <div>
                        <label for="cfg-school-session" class="block text-xs font-semibold text-slate-600 mb-1">Academic Session</label>
                        <input
                            type="text"
                            id="cfg-school-session"
                            class="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                            bind:value={academicSession}
                        />
                    </div>

                    <button
                        onclick={saveBranding}
                        class="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-sm transition"
                    >
                        💾 Save Branding Header
                    </button>
                </div>
            </div>
        {/if}
    </main>
</div>
