import mitt from 'mitt';

type Events = {
    [key: string]: any;
};

export const globalEventBus = mitt<Events>();
