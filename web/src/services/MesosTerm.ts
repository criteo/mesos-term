import Axios from "axios";
import { UnauthorizedAccessError, TaskNotFoundError } from "../errors";


export interface CreateTerminalResponse {
    master_url: string;
    task: {
        admins: string[];
        agent_url: string;
        container_id: string;
        framework_id: string;
        labels: { [key: string]: string };
        slave_hostname: string
        slave_id: string;
        task_id: string;
        user: string;
    };
    token: string;
}

export async function postCreateTerminal(taskID: string, accessToken: string | null) {
    let url = `/api/terminals/create/${taskID}`;
    if (accessToken) {
        url += `?access_token=${accessToken}`;
    }
    const res = await Axios.post<CreateTerminalResponse>(url, null, {
        validateStatus: (code: number) => true,
        withCredentials: true,
    });

    if (res.status === 400) {
        throw new Error(res.data as any);
    }

    if (res.status === 404) {
        throw new TaskNotFoundError();
    }

    if (res.status === 403) {
        throw new UnauthorizedAccessError();
    }

    if (res.status !== 200) {
        throw new Error(`Status code ${res.status} != 200`);
    }
    return res.data;
}

export async function postResizeTerminal(token: string, rows: number, cols: number) {
    const res = await Axios.post(`/api/terminals/resize?cols=${cols}&rows=${rows}&token=${token}`, null, {
        withCredentials: true,
    })

    if (res.status !== 200) {
        throw new Error(`Status code ${res.status} != 200`);
    }
}

interface GenerateDelegationRequest {
    delegate_to: string;
    task_id: string;
    duration: string;
}

type GenerateDelegationResponse = string;

export async function postGenerateDelegationToken(request: GenerateDelegationRequest) {
    const res = await Axios.post<GenerateDelegationResponse>(`/api/delegate`, request, {
        validateStatus: (code: number) => true
    });

    if (res.status !== 200) {
        throw new Error(`Unexpected status ${res.status}`);
    }

    return res.data;
}

export interface ConfigResponse {
    can_grant_access: boolean;
}

export async function getConfig() {
    const res = await Axios.get<ConfigResponse>(`/api/config`, {
        validateStatus: code => true,
    });

    if (res.status !== 200) {
        throw new Error(`Unexpected status ${res.status}`);
    }

    return res.data;
}

export interface FileDescription {
    gid: string;
    mode: string;
    mtime: string,
    path: string;
    size: number;
    uid: string;
}

export async function browseSandbox(taskID: string, path: string) {
    const res = await Axios.get<FileDescription[]>(`/api/sandbox/browse?taskID=${taskID}&path=${encodeURIComponent(path)}`, {
        validateStatus: c => c === 400 || c === 403 || c === 200
    });

    if (res.status === 400) {
        throw new Error(res.data as any);
    }

    if (res.status === 403) {
        throw new UnauthorizedAccessError();
    }

    return res.data;
}

export interface FileData {
    data: string;
    offset: number;
}

export async function readSandboxFile(taskID: string, path: string, offset: number, size: number) {
    const res = await Axios.get<FileData>(`/api/sandbox/read?taskID=${taskID}&path=${encodeURIComponent(path)}&offset=${offset}&size=${size}`);
    return res.data;
}

export async function downloadSandboxFile(taskID: string, path: string, directory: boolean) {
    const res = await Axios.get<string>(`/api/sandbox/download?taskID=${taskID}&path=${encodeURIComponent(path)}&directory=${directory}`, {
        headers: {
            'Accept': 'application/octet-stream',
        },
        responseType: 'blob',
    });
    return res.data;
}