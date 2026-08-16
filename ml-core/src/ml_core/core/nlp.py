import spacy

nlp = spacy.load("es_core_news_sm")
STOPWORDS = nlp.Defaults.stop_words
_accent = str.maketrans("áéíóúüñ", "aeiouun")


def normalize(text):
    return text.lower().translate(_accent)


def tokenize(text, remove_stopwords=True):
    doc = nlp(normalize(text))
    tokens = []
    for tok in doc:
        if tok.is_punct or tok.is_space or tok.is_digit:
            continue
        tokens.append(tok.text)
        lemma = tok.lemma_
        if lemma != tok.text:
            tokens.append(lemma)
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 1]
    return tokens


def token_overlap(a, b):
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)
