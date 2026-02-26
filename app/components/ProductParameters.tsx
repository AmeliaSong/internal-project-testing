export function ProductParameters() {
    return (
        <s-choice-list label="Filters" name="filters" multiple>
            <s-choice value="missing-images">Missing Images</s-choice>
            <s-choice value="blank-description">Blank Description</s-choice>
        </s-choice-list>
    );
}