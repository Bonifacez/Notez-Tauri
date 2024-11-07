import PROMPTS from "@/app/api/prompts";

const validParams: { [key: string]: string[] } = {
    model: ['deepseek', 'openai'],
    action: Object.keys(PROMPTS)
};

interface urlParams {
    params: {
        model: string;
        action: string;
        [key: string]: string;
    }
}


function checkUrlParams(params: { [key: string]: string }) {
    for (const key in params) {
        if (validParams[key] && !validParams[key].includes(params[key])) {
            return false
        }
    }
    return true
}

export {checkUrlParams}

export type {urlParams}