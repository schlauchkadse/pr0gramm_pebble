
interface IPostTag {
    id: number;
    confidence: number;
    tag: string;
}

interface IPostComment {
    id: number;
    parent: number;
    created: number;
    up: number;
    down: number;
    mark: number;
    confidence: number;
    content: string;
}

interface IPostInfo {
    tags: IPostTag[];
    comments: IPostComment[];
    ts: number;
    cache: string;
    rt: number;
    qc: number;
}

interface IPost {
    id: number;
    promoted: boolean;
    up: number;
    down: number;
    created: number;
    image: string;
    thumb: string;
    fullsize: any;
    source: any;
    flags: number;
    user: string;
    mark: boolean;
    // Non API
    info?: IPostInfo;
    index?: number;
}

interface ILatestPosts {
    atEnd: boolean;
    atStart: boolean;
    error: any;
    items: IPost[];
    ts: number;
    cache: string;
    rt: number;
    qc: number;
}
