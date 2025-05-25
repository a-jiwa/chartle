export default function ResultInfo({ title, description }) {
    const fallbackTitle = "About this data";
    const fallbackDesc = "No additional information is available for this topic.";

    return (
        <div className="mt-15 px-[50px] space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">
                {title || fallbackTitle}
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
                {description || fallbackDesc}
            </p>
        </div>
    );
}
