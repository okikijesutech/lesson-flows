export interface CurriculumNode {
    id: string;
    scheme_version: string;
    class_level: string;
    subject: string;
    term: number;
    week: number;
    topic: string;
    sub_topics: string[];
    official_performance_objectives: string[];
    suggested_materials: string[];
    continuity_type: 'new_concept' | 'continuation' | 'spiral_deepening';
    previous_topic_recap?: string;
    pedagogical_guidance?: string;
    nigerian_context?: {
        local_examples?: string;
        average_age?: string;
        cultural_references?: string;
    };
}

export interface LessonPlan {
    subject: string;
    class_level: string;
    week: number;
    duration: string;
    average_age: string;
    scheme_version: string;
    topic: string;
    sub_topics: string[];
    continuity_type: string;
    behavioral_objectives: string[];
    instructional_materials: string[];
    entry_behavior: string;
    introduction: string;
    presentation_steps: Array<{
        step_number: string;
        teacher_activity: string;
        student_activity: string;
        method: string;
    }>;
    evaluation_questions: string[];
    summary: string;
    assignment: string;
}

export interface ChalkboardSection {
    heading: string;
    content: string[];
}

export interface LessonNote {
    id: string;
    curriculum_node_id: string;
    class_level: string;
    subject: string;
    term: number;
    week: number;
    topic: string;
    content_json: {
        school: {
            name: string;
            motto: string;
            term: string;
            session: string;
        };
        lesson_plan: LessonPlan;
        chalkboard_content: {
            sections: ChalkboardSection[];
        };
    };
    pdf_url: string;
    html_url: string;
    created_at: string;
}
