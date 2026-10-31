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

    let classes = $state<string[]>(['JSS 1', 'JSS 2', 'JSS 3']);
    let selectedScheme = $state<string>('new_nerdc_v1');
    let selectedClass = $state<string>('');
    let selectedTerm = $state<number>(1);
    let subjects = $state<string[]>([]);
    let selectedSubject = $state<string>('');
    let weeks = $state<CurriculumNode[]>([]);
    let selectedWeekId = $state<string>('');
    let selectedDuration = $state<string>('40 mins');
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

    // Curriculum Correction Modal State
    let isEditingNode = $state<boolean>(false);
    let editTopic = $state<string>('');
    let editSubtopics = $state<string>('');
    let editContinuity = $state<string>('new_concept');
    let editRecap = $state<string>('');
    let isSavingNode = $state<boolean>(false);

    // Dynamic API Base URL
    const API_BASE = (
        import.meta.env.VITE_API_URL ||
        (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : 'https://lesson-flows-api.onrender.com')
    ).replace(/\/$/, '');

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
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    classes = data;
                }
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    }

    async function loadSubjectsForClass(val: string) {
        if (!val) {
            subjects = [];
            return;
        }
        try {
            const res = await fetch(apiUrl(`/api/v1/curriculum/subjects?class_level=${encodeURIComponent(val)}&scheme_version=${selectedScheme}`));
            if (res.ok) {
                subjects = await res.json();
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    }

    async function handleSchemeChange(scheme: string) {
        selectedScheme = scheme;
        selectedSubject = '';
        selectedWeekId = '';
        weeks = [];
        if (selectedClass) {
            await loadSubjectsForClass(selectedClass);
        }
    }

    async function handleClassChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        selectedClass = val;
        selectedSubject = '';
        selectedWeekId = '';
        weeks = [];
        await loadSubjectsForClass(val);
    }

    async function loadWeeks() {
        selectedWeekId = '';
        weeks = [];
        if (!selectedClass || !selectedSubject) return;

        try {
            const url = `/api/v1/curriculum/weeks?class_level=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}&term=${selectedTerm}&scheme_version=${selectedScheme}`;
            const res = await fetch(apiUrl(url));
            if (res.ok) {
                weeks = await res.json();
            }
        } catch (err) {
            console.error('Error fetching weeks:', err);
        }
    }

    function openEditModal() {
        if (!selectedNode) return;
        editTopic = selectedNode.topic;
        editSubtopics = (selectedNode.sub_topics || []).join('\n');
        editContinuity = selectedNode.continuity_type || 'new_concept';
        editRecap = selectedNode.previous_topic_recap || '';
        isEditingNode = true;
    }

    async function saveNodeCorrection() {
        if (!selectedNode) return;
        isSavingNode = true;
        try {
            const subtopicsList = editSubtopics.split('\n').map(s => s.trim()).filter(Boolean);
            const payload = {
                topic: editTopic,
                sub_topics: subtopicsList,
                continuity_type: editContinuity,
                previous_topic_recap: editRecap
            };

            const res = await fetch(apiUrl(`/api/v1/curriculum/node/${selectedNode.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to update curriculum node');

            const updatedNode: CurriculumNode = await res.json();
            const idx = weeks.findIndex(w => w.id === updatedNode.id);
            if (idx !== -1) {
                weeks[idx] = updatedNode;
            }
            isEditingNode = false;
            alert('✅ Scheme topic corrected and saved to database successfully!');
        } catch (err: any) {
            alert(err.message || 'Error updating curriculum node');
        } finally {
            isSavingNode = false;
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
                duration: selectedDuration.includes('mins') ? selectedDuration : `${selectedDuration} Minutes`,
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
            activeTab = 'reader'; // Automatically open in the mobile reader view
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
                text += `• ${line}\n`;
            });
            text += `\n`;
        });

        if (c.lesson_plan.assignment) {
            text += `*TAKE-HOME ASSIGNMENT:*\n✍️ ${c.lesson_plan.assignment}\n`;
        }

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

<!-- Mobile-First App Shell -->
<div class="min-h-screen bg-slate-100/80 text-slate-900 font-sans pb-24 flex justify-center">
    <div class="w-full max-w-md bg-white min-h-screen shadow-xl flex flex-col relative border-x border-slate-200/60">
        
        <!-- Top App Bar (Matches Uizard Screen 1 & 4) -->
        <header class="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-xl">📚</span>
                <div>
                    <h1 class="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                        LessonFlows
                    </h1>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5">NERDC & Lagos Unified Standard</p>
                </div>
            </div>
            
            <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                <span>🛡️</span> Verified Scheme
            </div>
        </header>

        <!-- Main Body Screens -->
        <main class="flex-1 p-4 overflow-y-auto">

            <!-- ================= SCREEN 1: GENERATOR TAB ================= -->
            {#if activeTab === 'generator'}
                <div class="space-y-4">
                    
                    <!-- Curriculum Scheme Toggle (Uizard Screen 2 & 4) -->
                    <div class="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                        <button
                            type="button"
                            class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 {selectedScheme === 'new_nerdc_v1' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                            onclick={() => handleSchemeChange('new_nerdc_v1')}
                        >
                            <span>🌟</span> New NERDC Scheme
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 {selectedScheme === 'old_lagos_v1' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                            onclick={() => handleSchemeChange('old_lagos_v1')}
                        >
                            <span>🏛️</span> Lagos Legacy
                        </button>
                    </div>

                    <!-- Dropdown Form Card -->
                    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label for="class-select" class="block text-[11px] font-bold text-slate-600 mb-1">Class Level</label>
                                <select
                                    id="class-select"
                                    class="w-full bg-slate-50/50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:border-emerald-600 focus:bg-white focus:outline-none"
                                    onchange={handleClassChange}
                                >
                                    <option value="">-- Class --</option>
                                    {#each classes as c}
                                        <option value={c}>{c}</option>
                                    {/each}
                                </select>
                            </div>

                            <div>
                                <label for="term-select" class="block text-[11px] font-bold text-slate-600 mb-1">Academic Term</label>
                                <select
                                    id="term-select"
                                    class="w-full bg-slate-50/50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:border-emerald-600 focus:bg-white focus:outline-none"
                                    bind:value={selectedTerm}
                                    onchange={loadWeeks}
                                >
                                    <option value={1}>1st Term</option>
                                    <option value={2}>2nd Term</option>
                                    <option value={3}>3rd Term</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label for="subject-select" class="block text-[11px] font-bold text-slate-600 mb-1">Subject</label>
                            <select
                                id="subject-select"
                                class="w-full bg-slate-50/50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:border-emerald-600 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
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

                        <div>
                            <label for="week-select" class="block text-[11px] font-bold text-slate-600 mb-1">Week & Topic</label>
                            <select
                                id="week-select"
                                class="w-full bg-slate-50/50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:border-emerald-600 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                bind:value={selectedWeekId}
                                disabled={!selectedSubject || weeks.length === 0}
                            >
                                <option value="">-- Choose Week / Topic --</option>
                                {#each weeks as w}
                                    <option value={w.id}>
                                        Week {w.week}: {w.topic}
                                    </option>
                                {/each}
                            </select>

                            <!-- Topic Preview Badge (Matches Uizard Topic Card) -->
                            {#if selectedNode}
                                <div class="mt-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <span class="font-extrabold text-emerald-950 text-xs">
                                            Week {selectedNode.week}: {selectedNode.topic}
                                        </span>
                                        <button
                                            type="button"
                                            onclick={openEditModal}
                                            class="text-indigo-800 hover:text-indigo-950 font-bold text-[10px] bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                                            {selectedNode.continuity_type.replace('_', ' ')}
                                        </span>
                                        <span class="text-[11px] text-slate-600 truncate">
                                            Entry: {selectedNode.previous_topic_recap || 'Baseline concepts'}
                                        </span>
                                    </div>
                                </div>
                            {/if}
                        </div>

                        <!-- Period Duration Chips (Matches Uizard Pill Selector) -->
                        <div>
                            <span class="block text-[11px] font-bold text-slate-600 mb-1.5">Choose Period Length</span>
                            <div class="grid grid-cols-3 gap-2">
                                {#each ['40 mins', '60 mins', '80 mins'] as dur}
                                    <button
                                        type="button"
                                        class="py-2 text-xs font-bold rounded-lg border transition text-center {selectedDuration === dur ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
                                        onclick={() => selectedDuration = dur}
                                    >
                                        {dur}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Primary Action Button (Matches Uizard Screen 2 & 5) -->
                        <button
                            type="button"
                            class="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold text-white transition flex items-center justify-center gap-2 shadow-md {isGenerating || !selectedWeekId ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 active:scale-[0.99]'}"
                            onclick={generateDocument}
                            disabled={isGenerating || !selectedWeekId}
                        >
                            {#if isGenerating}
                                <span class="animate-spin text-sm">⏳</span>
                                <span>Generating Lesson Note...</span>
                            {:else}
                                <span>⚡ Generate Lesson Note & Chalkboard Content</span>
                            {/if}
                        </button>
                    </div>

                    <!-- Quick Jump to Reader if Note Already Exists -->
                    {#if currentNote}
                        <div class="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center justify-between">
                            <div>
                                <p class="text-[10px] font-bold uppercase text-indigo-800">Generated Lesson Ready</p>
                                <p class="text-xs font-extrabold text-slate-900">{currentNote.subject} (Week {currentNote.week})</p>
                            </div>
                            <button
                                onclick={() => activeTab = 'reader'}
                                class="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs"
                            >
                                📖 Open Reader
                            </button>
                        </div>
                    {/if}
                </div>

            <!-- ================= SCREEN 2: IN-APP READER TAB (Uizard Screen 1 & 5) ================= -->
            {:else if activeTab === 'reader'}
                {#if !currentNote}
                    <div class="bg-white rounded-xl border border-slate-200 p-8 text-center my-8 shadow-xs">
                        <span class="text-4xl block mb-2">📖</span>
                        <h3 class="text-sm font-bold text-slate-900 mb-1">No Note Open for Reading</h3>
                        <p class="text-xs text-slate-500 mb-4">
                            Generate a new lesson note or select an existing one from your Saved Library.
                        </p>
                        <button
                            onclick={() => activeTab = 'generator'}
                            class="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs"
                        >
                            📝 Go to Generator
                        </button>
                    </div>
                {:else}
                    {@const lp = currentNote.content_json.lesson_plan}
                    {@const cb = currentNote.content_json.chalkboard_content}
                    {@const sch = currentNote.content_json.school}

                    <div class="space-y-3">
                        <!-- Top View Switcher Pills (Matches Uizard Screen 1 & 5) -->
                        <div class="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1">
                            <button
                                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition {readerSubTab === 'chalkboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                                onclick={() => readerSubTab = 'chalkboard'}
                            >
                                📝 Chalkboard Content
                            </button>
                            <button
                                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition {readerSubTab === 'lesson_plan' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                                onclick={() => readerSubTab = 'lesson_plan'}
                            >
                                📑 Statutory Lesson Plan
                            </button>
                        </div>

                        <!-- Teacher Floating Toolbelt (Matches Uizard Toolbar) -->
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-1 flex-wrap">
                            <!-- Font Scaler -->
                            <div class="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'normal' ? 'bg-emerald-800 text-white' : 'text-slate-600'}"
                                    onclick={() => readerFontSize = 'normal'}
                                >
                                    A
                                </button>
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'large' ? 'bg-emerald-800 text-white' : 'text-slate-600'}"
                                    onclick={() => readerFontSize = 'large'}
                                >
                                    A+
                                </button>
                                <button
                                    class="px-2 py-1 rounded {readerFontSize === 'xl' ? 'bg-emerald-800 text-white' : 'text-slate-600'}"
                                    onclick={() => readerFontSize = 'xl'}
                                >
                                    A++
                                </button>
                            </div>

                            <div class="flex items-center gap-1.5">
                                <button
                                    onclick={copyChalkboard}
                                    class="bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                >
                                    📋 Copy
                                </button>
                                <a
                                    href={apiUrl(currentNote.pdf_url)}
                                    target="_blank"
                                    class="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                >
                                    📥 PDF
                                </a>
                            </div>
                        </div>

                        <!-- Content Render Area -->
                        {#if readerSubTab === 'chalkboard'}
                            <!-- Authentic Mobile Chalkboard Theme (Matches Uizard Blackboard Screen 1 & 5) -->
                            <div class="bg-[#0B1528] text-white rounded-xl p-4 sm:p-5 shadow-lg space-y-4 border border-slate-800 {readerTextClass}">
                                <div class="border-b border-slate-800 pb-2">
                                    <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Classroom Blackboard Notes</span>
                                    <h3 class="text-base font-extrabold text-white mt-0.5">
                                        {lp.subject.toUpperCase()}: {lp.topic}
                                    </h3>
                                    <p class="text-[11px] text-slate-400">{lp.class_level} • Term 1, Week {lp.week}</p>
                                </div>

                                {#each cb.sections as sec, idx}
                                    <div class="space-y-1.5">
                                        <h4 class="font-bold text-amber-400 text-xs sm:text-sm">
                                            {idx + 1}. {sec.heading}
                                        </h4>
                                        <ul class="space-y-1 text-slate-200 text-xs sm:text-sm pl-2">
                                            {#each sec.content as line}
                                                <li class="flex items-start gap-1.5">
                                                    <span class="text-emerald-400 mt-1">•</span>
                                                    <span>{line}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/each}

                                <!-- Take-Home Assignment Box (Matches Uizard Orange Box) -->
                                {#if lp.assignment}
                                    <div class="bg-amber-950/80 border border-amber-500/80 rounded-xl p-3 text-amber-200">
                                        <h5 class="text-xs font-extrabold uppercase flex items-center gap-1 text-amber-300 mb-1">
                                            <span>✍️</span> Take-Home Assignment
                                        </h5>
                                        <p class="text-xs font-medium text-amber-100">{lp.assignment}</p>
                                    </div>
                                {/if}
                            </div>

                        {:else}
                            <!-- Statutory Lesson Plan View (Administrative Grid) -->
                            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 {readerTextClass}">
                                <div class="text-center pb-2 border-b border-slate-200">
                                    <h4 class="font-extrabold text-slate-900 text-sm uppercase">{sch.name}</h4>
                                    <p class="text-[10px] italic text-slate-500">"{sch.motto}"</p>
                                    <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                        {sch.term} • {sch.session}
                                    </span>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-xs border-collapse border border-slate-200">
                                        <tbody>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-1.5 font-bold bg-slate-50 w-1/3">Subject</td>
                                                <td class="p-1.5">{lp.subject}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-1.5 font-bold bg-slate-50">Class / Week</td>
                                                <td class="p-1.5">{lp.class_level} (Week {lp.week})</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-1.5 font-bold bg-slate-50">Topic</td>
                                                <td class="p-1.5 font-bold text-slate-900">{lp.topic}</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-1.5 font-bold bg-slate-50">Objectives</td>
                                                <td class="p-1.5">
                                                    <ul class="list-disc pl-3 space-y-0.5">
                                                        {#each lp.behavioral_objectives as obj}
                                                            <li>{obj}</li>
                                                        {/each}
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="p-1.5 font-bold bg-slate-50">Materials</td>
                                                <td class="p-1.5">
                                                    {(lp.instructional_materials || []).join(', ') || 'Chalkboard, chart diagrams, textbooks.'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Presentation Steps -->
                                <div>
                                    <span class="block text-[11px] font-bold text-slate-700 mb-1">Presentation Steps</span>
                                    <div class="space-y-1.5">
                                        {#each lp.presentation_steps as st}
                                            <div class="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                                <span class="font-bold text-emerald-900">{st.step_number}:</span>
                                                <p class="text-slate-800 mt-0.5"><span class="font-semibold">Teacher:</span> {st.teacher_activity}</p>
                                                <p class="text-slate-600 mt-0.5"><span class="font-semibold">Student:</span> {st.student_activity}</p>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

            <!-- ================= SCREEN 3: SAVED LIBRARY (Matches Uizard Screen 1 & 5) ================= -->
            {:else if activeTab === 'library'}
                <div class="space-y-3">
                    <div class="flex items-center justify-between pb-1">
                        <h2 class="font-extrabold text-sm text-slate-900">Saved Library ({library.length})</h2>
                        <span class="text-[10px] text-slate-500 font-medium">Session History</span>
                    </div>

                    {#if library.length === 0}
                        <div class="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
                            <span class="text-3xl block mb-2">📁</span>
                            <p class="text-xs font-bold text-slate-700">No saved notes yet</p>
                            <p class="text-[11px] text-slate-500 mt-0.5">Notes you generate will appear here for instant offline access.</p>
                        </div>
                    {:else}
                        <!-- Cards matching Uizard Saved Library Layout -->
                        <div class="space-y-2">
                            {#each library as n}
                                <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between gap-2 hover:border-emerald-300 transition">
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <div class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-sm shrink-0">
                                            📄
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-xs font-bold text-slate-900 truncate">{n.subject} — {n.topic}</p>
                                            <p class="text-[10px] text-slate-500">{n.class_level} • Week {n.week}</p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onclick={() => { currentNote = n; activeTab = 'reader'; }}
                                            class="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                                        >
                                            Read
                                        </button>
                                        <a
                                            href={apiUrl(n.pdf_url)}
                                            target="_blank"
                                            class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200"
                                        >
                                            PDF
                                        </a>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

            <!-- ================= SCREEN 4: SCHOOL SETTINGS ================= -->
            {:else if activeTab === 'branding'}
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                    <h2 class="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>🏫</span> School Crest & Header Settings
                    </h2>
                    <p class="text-[11px] text-slate-500">This information will be stamped on every downloaded PDF document.</p>

                    <div class="space-y-2.5">
                        <div>
                            <label for="cfg-school-name" class="block text-[11px] font-bold text-slate-600 mb-1">School Name</label>
                            <input
                                type="text"
                                id="cfg-school-name"
                                class="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                                bind:value={schoolName}
                            />
                        </div>

                        <div>
                            <label for="cfg-school-motto" class="block text-[11px] font-bold text-slate-600 mb-1">School Motto</label>
                            <input
                                type="text"
                                id="cfg-school-motto"
                                class="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                                bind:value={schoolMotto}
                            />
                        </div>

                        <div>
                            <label for="cfg-school-session" class="block text-[11px] font-bold text-slate-600 mb-1">Academic Session</label>
                            <input
                                type="text"
                                id="cfg-school-session"
                                class="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                                bind:value={academicSession}
                            />
                        </div>

                        <button
                            onclick={saveBranding}
                            class="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition"
                        >
                            💾 Save Header Settings
                        </button>
                    </div>
                </div>
            {/if}
        </main>

        <!-- Sticky Bottom Navigation Bar (Matches Uizard Screen 1, 2, 4, 5) -->
        <nav class="bg-white border-t border-slate-200/90 fixed bottom-0 left-0 right-0 z-40 flex justify-center shadow-lg">
            <div class="w-full max-w-md grid grid-cols-4 px-1 py-1.5">
                <button
                    class="flex flex-col items-center justify-center py-1 rounded-lg transition {activeTab === 'generator' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800 font-medium'}"
                    onclick={() => activeTab = 'generator'}
                >
                    <span class="text-base">⚡</span>
                    <span class="text-[10px]">Generate</span>
                </button>
                <button
                    class="flex flex-col items-center justify-center py-1 rounded-lg transition {activeTab === 'reader' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800 font-medium'}"
                    onclick={() => activeTab = 'reader'}
                >
                    <span class="text-base">📖</span>
                    <span class="text-[10px]">Reader</span>
                </button>
                <button
                    class="flex flex-col items-center justify-center py-1 rounded-lg transition {activeTab === 'library' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800 font-medium'}"
                    onclick={() => activeTab = 'library'}
                >
                    <span class="text-base">📚</span>
                    <span class="text-[10px]">Library</span>
                </button>
                <button
                    class="flex flex-col items-center justify-center py-1 rounded-lg transition {activeTab === 'branding' ? 'text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800 font-medium'}"
                    onclick={() => activeTab = 'branding'}
                >
                    <span class="text-base">⚙️</span>
                    <span class="text-[10px]">Settings</span>
                </button>
            </div>
        </nav>

        <!-- Edit Topic Bottom Sheet / Modal (Matches Uizard Screen 2 & 4) -->
        {#if isEditingNode && selectedNode}
            <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-end sm:items-center justify-center">
                <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 space-y-3 border-t sm:border border-slate-200 animate-in slide-in-from-bottom-5 duration-200">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                            <span class="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Scheme Correction</span>
                            <h3 class="font-extrabold text-slate-900 text-sm">Edit Week {selectedNode.week} Syllabus Topic</h3>
                        </div>
                        <button
                            onclick={() => isEditingNode = false}
                            class="text-slate-400 hover:text-slate-700 font-bold text-lg px-1.5"
                        >
                            ✕
                        </button>
                    </div>

                    <div>
                        <label for="edit-topic-input" class="block text-[11px] font-bold text-slate-700 mb-1">Topic Title</label>
                        <input
                            id="edit-topic-input"
                            type="text"
                            bind:value={editTopic}
                            class="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:border-indigo-600 focus:outline-none"
                            placeholder="Enter official topic name"
                        />
                    </div>

                    <div>
                        <label for="edit-subtopics-input" class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>Subtopics</span>
                            <span class="text-[9px] text-slate-400">One per line</span>
                        </label>
                        <textarea
                            id="edit-subtopics-input"
                            rows="3"
                            bind:value={editSubtopics}
                            class="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-indigo-600 focus:outline-none font-mono"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label for="edit-continuity-select" class="block text-[11px] font-bold text-slate-700 mb-1">Continuity</label>
                            <select
                                id="edit-continuity-select"
                                bind:value={editContinuity}
                                class="w-full border border-slate-300 rounded-lg p-1.5 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                            >
                                <option value="new_concept">🌱 New Concept</option>
                                <option value="continuation">🔄 Part II</option>
                                <option value="revision">📝 Revision</option>
                            </select>
                        </div>

                        <div>
                            <label for="edit-recap-input" class="block text-[11px] font-bold text-slate-700 mb-1">Entry Knowledge</label>
                            <input
                                id="edit-recap-input"
                                type="text"
                                bind:value={editRecap}
                                class="w-full border border-slate-300 rounded-lg p-1.5 text-xs focus:border-indigo-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                            type="button"
                            onclick={() => isEditingNode = false}
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onclick={saveNodeCorrection}
                            disabled={isSavingNode}
                            class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition"
                        >
                            {isSavingNode ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}

    </div>
</div>
