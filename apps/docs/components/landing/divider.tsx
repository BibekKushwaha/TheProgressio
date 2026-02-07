import React from 'react'

const Divider = ({ text }: { text?: string }) => {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
            </div>
            {text && (
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-700">{text}</span>
                </div>
            )}
        </div>
    )
}

export default Divider