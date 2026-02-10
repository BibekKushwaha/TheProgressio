"use client"

import * as React from "react"

function Tabs({ className, ...props }: React.ComponentProps<"div"> & { value?: string; onValueChange?: (value: string) => void; defaultValue?: string }) {
    const [activeTab, setActiveTab] = React.useState(props.defaultValue || props.value || '');

    React.useEffect(() => {
        if (props.value !== undefined) setActiveTab(props.value);
    }, [props.value]);

    const contextValue = React.useMemo(() => ({
        activeTab,
        setActiveTab: (value: string) => {
            setActiveTab(value);
            props.onValueChange?.(value);
        }
    }), [activeTab, props.onValueChange]);

    return (
        <TabsContext.Provider value={contextValue}>
            <div className={className} {...{ ...props, value: undefined, onValueChange: undefined, defaultValue: undefined }} />
        </TabsContext.Provider>
    );
}

const TabsContext = React.createContext<{ activeTab: string; setActiveTab: (value: string) => void }>({
    activeTab: '',
    setActiveTab: () => { }
});

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            role="tablist"
            className={`inline-flex h-10 items-center justify-center rounded-md bg-white/5 p-1 text-slate-400 ${className || ''}`}
            {...props}
        />
    );
}

function TabsTrigger({ className, value, ...props }: React.ComponentProps<"button"> & { value: string }) {
    const { activeTab, setActiveTab } = React.useContext(TabsContext);
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            data-state={isActive ? 'active' : 'inactive'}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${isActive ? 'bg-white/10 text-white shadow-sm' : 'hover:bg-white/5 hover:text-white'
                } ${className || ''}`}
            onClick={() => setActiveTab(value)}
            {...props}
        />
    );
}

function TabsContent({ className, value, ...props }: React.ComponentProps<"div"> & { value: string }) {
    const { activeTab } = React.useContext(TabsContext);

    if (activeTab !== value) return null;

    return (
        <div
            role="tabpanel"
            className={className}
            {...props}
        />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
