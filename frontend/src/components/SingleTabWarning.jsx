import React from "react";

function SingleTabWarning() {
    return (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3 text-yellow-900 text-sm">
                <span className="text-lg">⚠️</span>
                <div>
                    <strong>Multiple tabs detected.</strong>
                    <br />
                    Please keep only one SpendWise tab open to avoid data issues.
                </div>
            </div>
        </div>
    );
}

export default SingleTabWarning;